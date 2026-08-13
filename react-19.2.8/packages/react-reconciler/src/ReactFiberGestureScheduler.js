/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {FiberRoot} from './ReactInternalTypes';
import type {GestureOptions} from 'shared/ReactTypes';
import type {GestureTimeline, RunningViewTransition} from './ReactFiberConfig';
import type {TransitionTypes} from 'react/src/ReactTransitionType';
import type {Lane} from './ReactFiberLane';

import {
  GestureLane,
  markRootEntangled,
  markRootFinished,
  NoLane,
  NoLanes,
} from './ReactFiberLane';
import {
  ensureRootIsScheduled,
  requestTransitionLane,
} from './ReactFiberRootScheduler';
import {getCurrentGestureOffset, stopViewTransition} from './ReactFiberConfig';
import {pingGestureRoot, restartGestureRoot} from './ReactFiberWorkLoop';

// 保存一个已经安排或正在执行的手势过渡，以及它的执行、提交和队列状态。
export type ScheduledGesture = {
  // 提供手势当前进度的时间线，例如用户返回手势已经拖动到百分之多少。
  provider: GestureTimeline,
  // 同一个 provider 被启动但尚未结束的次数；归零时决定提交目标界面还是恢复原界面。
  count: number,
  // 手势开始时所在的进度百分比，代表“当前界面”对应的位置。
  rangeStart: number,
  // 手势完成目标界面时的进度百分比，方向相反时可以小于 rangeStart。
  rangeEnd: number,
  // startGestureTransition 期间通过 addTransitionType 添加的过渡类型。
  types: null | TransitionTypes,
  // 当前正在运行的 View Transition；手势结束或取消后用它停止动画。
  running: null | RunningViewTransition,
  // Fiber 树已经准备好、但仍等待手势决定时保存的提交回调。
  commit: null | (() => void),
  // 手势松开后是否决定进入目标界面；为 true 时需要真正提交手势渲染结果。
  committing: boolean,
  // 手势取消或完成后，用于安排恢复/后续 Transition 更新的 Lane。
  revertLane: Lane,
  // 当前 Root 手势队列中的前一个手势。
  prev: null | ScheduledGesture,
  // 当前 Root 手势队列中的后一个手势。
  next: null | ScheduledGesture,
};

export function scheduleGesture(
  root: FiberRoot,
  provider: GestureTimeline,
): ScheduledGesture {
  let prev = root.pendingGestures;
  while (prev !== null) {
    if (prev.provider === provider) {
      // Existing instance found.
      return prev;
    }
    const next = prev.next;
    // $FlowFixMe[invalid-compare]
    if (next === null) {
      break;
    }
    prev = next;
  }
  const gesture: ScheduledGesture = {
    provider: provider,
    count: 0,
    rangeStart: 0, // Uninitialized
    rangeEnd: 100, // Uninitialized
    types: null,
    running: null,
    commit: null,
    committing: false,
    revertLane: NoLane, // Starts uninitialized.
    prev: prev,
    next: null,
  };
  if (prev === null) {
    root.pendingGestures = gesture;
  } else {
    prev.next = gesture;
  }
  ensureRootIsScheduled(root);
  return gesture;
}

export function startScheduledGesture(
  root: FiberRoot,
  gestureTimeline: GestureTimeline,
  gestureOptions: ?GestureOptions,
  transitionTypes: null | TransitionTypes,
): null | ScheduledGesture {
  const rangeStart =
    gestureOptions && gestureOptions.rangeStart != null
      ? gestureOptions.rangeStart
      : getCurrentGestureOffset(gestureTimeline);
  const rangeEnd =
    gestureOptions && gestureOptions.rangeEnd != null
      ? gestureOptions.rangeEnd
      : rangeStart < 50
        ? 100
        : 0;
  let prev = root.pendingGestures;
  while (prev !== null) {
    if (prev.provider === gestureTimeline) {
      // Existing instance found.
      prev.count++;
      // Update the options.
      prev.rangeStart = rangeStart;
      prev.rangeEnd = rangeEnd;
      if (transitionTypes !== null) {
        let scheduledTypes = prev.types;
        if (scheduledTypes === null) {
          scheduledTypes = prev.types = [];
        }
        for (let i = 0; i < transitionTypes.length; i++) {
          const transitionType = transitionTypes[i];
          if (scheduledTypes.indexOf(transitionType) === -1) {
            scheduledTypes.push(transitionType);
          }
        }
      }
      return prev;
    }
    const next = prev.next;
    // $FlowFixMe[invalid-compare]
    if (next === null) {
      break;
    }
    prev = next;
  }
  // No scheduled gestures. It must mean nothing for this renderer updated but
  // some other renderer might have updated.
  return null;
}

export function cancelScheduledGesture(
  root: FiberRoot,
  gesture: ScheduledGesture,
): void {
  // Entangle any Transitions started in this event with the revertLane of the gesture
  // so that we commit them all together.
  if (gesture.revertLane !== NoLane) {
    const entangledLanes = gesture.revertLane | requestTransitionLane(null);
    markRootEntangled(root, entangledLanes);
  }

  gesture.count--;
  if (gesture.count === 0) {
    // If the end state is closer to the end than the beginning then we commit into the
    // end state before reverting back (or applying a new Transition).
    // Otherwise we just revert back and don't commit.
    let shouldCommit: boolean;
    const finalOffset = getCurrentGestureOffset(gesture.provider);
    const rangeStart = gesture.rangeStart;
    const rangeEnd = gesture.rangeEnd;
    if (rangeStart < rangeEnd) {
      shouldCommit = finalOffset > rangeStart + (rangeEnd - rangeStart) / 2;
    } else {
      shouldCommit = finalOffset < rangeEnd + (rangeStart - rangeEnd) / 2;
    }
    // TODO: If we're currently rendering this gesture, we need to restart the render
    // on a different gesture or cancel the render..
    // TODO: We might want to pause the View Transition at this point since you should
    // no longer be able to update the position of anything but it might be better to
    // just commit the gesture state.
    const runningTransition = gesture.running;
    if (runningTransition !== null && shouldCommit) {
      // If we are going to commit this gesture in its to state, we need to wait to
      // stop it until it commits. We should now schedule a render at the gesture
      // lane to actually commit it.
      gesture.committing = true;
      if (root.pendingGestures === gesture) {
        const commitCallback = gesture.commit;
        if (commitCallback !== null) {
          gesture.commit = null;
          // If we already have a commit prepared we can immediately commit the tree
          // without rerendering.
          // TODO: Consider scheduling this in a task instead of synchronously inside the last cancellation.s
          commitCallback();
        } else {
          // Ping the root given the new state. This is similar to pingSuspendedRoot.
          pingGestureRoot(root);
        }
      }
    } else {
      // If we're not going to commit this gesture we can stop the View Transition
      // right away and delete the scheduled gesture from the pending queue.
      if (gesture.prev === null) {
        if (root.pendingGestures === gesture) {
          // This was the currently rendering gesture.
          root.pendingGestures = gesture.next;
          let remainingLanes = root.pendingLanes;
          if (root.pendingGestures === null) {
            // Gestures don't clear their lanes while the gesture is still active but it
            // might not be scheduled to do any more renders and so we shouldn't schedule
            // any more gesture lane work until a new gesture is scheduled.
            remainingLanes &= ~GestureLane;
          }
          markRootFinished(
            root,
            GestureLane,
            remainingLanes,
            NoLane,
            NoLane,
            NoLanes,
          );
          // If we had a currently rendering gesture we need to now reset the gesture lane to
          // now render the next gesture or cancel if there's no more gestures in the queue.
          restartGestureRoot(root);
        }
        gesture.running = null;
        if (runningTransition !== null) {
          stopViewTransition(runningTransition);
        }
      } else {
        // This was not the current gesture so it doesn't affect the current render.
        gesture.prev.next = gesture.next;
        if (gesture.next !== null) {
          gesture.next.prev = gesture.prev;
        }
        gesture.prev = null;
        gesture.next = null;
      }
    }
  }
}

// 停止当前的手势任务的提交，停止正在运行的视图过渡
export function stopCommittedGesture(root: FiberRoot) {
  // The top was just committed. We can delete it from the queue
  // and stop its View Transition now.
  const committedGesture = root.pendingGestures;
  if (committedGesture !== null) {
    // Mark it as no longer committing and should no longer be included in rerenders.
    committedGesture.committing = false;
    const nextGesture = committedGesture.next;
    if (nextGesture === null) {
      // Gestures don't clear their lanes while the gesture is still active but it
      // might not be scheduled to do any more renders and so we shouldn't schedule
      // any more gesture lane work until a new gesture is scheduled.
      root.pendingLanes &= ~GestureLane;
    } else {
      nextGesture.prev = null;
    }
    root.pendingGestures = nextGesture;
    const runningTransition = committedGesture.running;
    if (runningTransition !== null) {
      committedGesture.running = null;
      stopViewTransition(runningTransition);
    }
  }
}

export function scheduleGestureCommit(
  gesture: ScheduledGesture,
  callback: () => void,
): () => void {
  gesture.commit = callback;
  return function () {
    gesture.commit = null;
  };
}
