/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  Instance,
  TextInstance,
  ActivityInstance,
  SuspenseInstance,
  Container,
  HoistableRoot,
  FormInstance,
  Props,
  SuspendedState,
} from './ReactFiberConfig';
import type {Fiber, FiberRoot} from './ReactInternalTypes';
import type {Lanes} from './ReactFiberLane';
import {
  includesLoadingIndicatorLanes,
  includesOnlySuspenseyCommitEligibleLanes,
  includesOnlyViewTransitionEligibleLanes,
} from './ReactFiberLane';
import type {ActivityState} from './ReactFiberActivityComponent';
import type {SuspenseState, RetryQueue} from './ReactFiberSuspenseComponent';
import type {UpdateQueue} from './ReactFiberClassUpdateQueue';
import type {FunctionComponentUpdateQueue} from './ReactFiberHooks';
import type {Wakeable, ViewTransitionProps} from 'shared/ReactTypes';
import type {
  OffscreenState,
  OffscreenInstance,
  OffscreenQueue,
} from './ReactFiberOffscreenComponent';
import type {Cache} from './ReactFiberCacheComponent';
import type {RootState} from './ReactFiberRoot';
import type {Transition} from 'react/src/ReactStartTransition';
import type {
  TracingMarkerInstance,
  TransitionAbort,
} from './ReactFiberTracingMarkerComponent';
import type {ViewTransitionState} from './ReactFiberViewTransitionComponent';

import {
  alwaysThrottleRetries,
  enableCreateEventHandleAPI,
  enableEffectEventMutationPhase,
  enableProfilerTimer,
  enableProfilerCommitHooks,
  enableSuspenseCallback,
  enableScopeAPI,
  enableUpdaterTracking,
  enableTransitionTracing,
  enableLegacyHidden,
  disableLegacyMode,
  enableComponentPerformanceTrack,
  enableViewTransition,
  enableFragmentRefs,
  enableDefaultTransitionIndicator,
  enableFragmentRefsTextNodes,
} from 'shared/ReactFeatureFlags';
import {
  FunctionComponent,
  ForwardRef,
  ClassComponent,
  HostRoot,
  HostComponent,
  HostHoistable,
  HostSingleton,
  HostText,
  HostPortal,
  Profiler,
  ActivityComponent,
  SuspenseComponent,
  DehydratedFragment,
  IncompleteClassComponent,
  MemoComponent,
  SimpleMemoComponent,
  SuspenseListComponent,
  ScopeComponent,
  OffscreenComponent,
  LegacyHiddenComponent,
  CacheComponent,
  TracingMarkerComponent,
  ViewTransitionComponent,
  Fragment,
} from './ReactWorkTags';
import {
  NoFlags,
  ContentReset,
  Placement,
  ChildDeletion,
  Snapshot,
  Update,
  Hydrate,
  Callback,
  Ref,
  Hydrating,
  Passive,
  BeforeMutationMask,
  BeforeAndAfterMutationTransitionMask,
  MutationMask,
  LayoutMask,
  PassiveMask,
  PassiveTransitionMask,
  Visibility,
  ShouldSuspendCommit,
  MaySuspendCommit,
  FormReset,
  Cloned,
  PerformedWork,
  ForceClientRender,
  DidCapture,
  AffectedParentLayout,
  ViewTransitionNamedStatic,
  PortalStatic,
} from './ReactFiberFlags';
import {
  commitStartTime,
  pushNestedEffectDurations,
  popNestedEffectDurations,
  bubbleNestedEffectDurations,
  resetComponentEffectTimers,
  pushComponentEffectStart,
  popComponentEffectStart,
  pushComponentEffectDuration,
  popComponentEffectDuration,
  pushComponentEffectErrors,
  popComponentEffectErrors,
  pushComponentEffectDidSpawnUpdate,
  popComponentEffectDidSpawnUpdate,
  componentEffectStartTime,
  componentEffectEndTime,
  componentEffectDuration,
  componentEffectErrors,
  componentEffectSpawnedUpdate,
} from './ReactProfilerTimer';
import {
  logComponentRender,
  logComponentErrored,
  logComponentEffect,
  logComponentMount,
  logComponentUnmount,
  logComponentReappeared,
  logComponentDisappeared,
  pushDeepEquality,
  popDeepEquality,
} from './ReactFiberPerformanceTrack';
import {ConcurrentMode, NoMode, ProfileMode} from './ReactTypeOfMode';
import {deferHiddenCallbacks} from './ReactFiberClassUpdateQueue';
import {
  // 当前宿主环境是否通过直接修改节点的方式提交更新。
  supportsMutation,
  // 当前宿主环境是否通过替换整套子节点的方式提交更新。
  supportsPersistence,
  // 当前宿主环境是否支持复用服务端生成的节点。
  supportsHydration,
  // 当前宿主环境是否支持管理可提升的样式、脚本等资源。
  supportsResources,
  // 当前宿主环境是否支持 html、head、body 单例节点。
  supportsSingletons,
  // 删除宿主父节点中的 Suspense 服务端边界及其内容。
  clearSuspenseBoundary,
  // 删除根容器中的 Suspense 服务端边界及其内容。
  clearSuspenseBoundaryFromContainer,
  // Persistence 模式下创建新的容器子节点集合。
  createContainerChildSet,
  // 清空根容器中的宿主节点。
  clearContainer,
  // 提交 Scope 更新前，将最新 Fiber 关联到 Scope 实例。
  prepareScopeUpdate,
  // Mutation 阶段开始前准备宿主环境，并记录当前获得焦点的实例。
  prepareForCommit,
  // 删除或隐藏当前焦点节点前，通知宿主环境即将失去焦点。
  beforeActiveInstanceBlur,
  // 删除 DOM 节点后，清理 React 缓存在节点上的 Fiber 和 props。
  detachDeletedInstance,
  // 获取可提升资源所属的 Document 或 ShadowRoot。
  getHoistableRoot,
  // 获取并挂载当前 Root 中的共享资源。
  acquireResource,
  // 释放当前 Root 中不再使用的共享资源。
  releaseResource,
  // Hydration 时复用已有的 title、meta、link 等提升节点。
  hydrateHoistable,
  // 首次提交时把普通提升节点挂载到正确位置。
  mountHoistable,
  // 卸载普通提升节点。
  unmountHoistable,
  // 提交提升节点前重置本次提交使用的查找缓存。
  prepareToCommitHoistables,
  // 判断同步提交是否允许等待当前宿主节点的资源。
  maySuspendCommitInSyncRender,
  // 将当前宿主节点依赖的加载任务加入提交暂停状态。
  suspendInstance,
  // 将共享资源的加载任务加入提交暂停状态。
  suspendResource,
  // 使用最新的 defaultValue 等属性重置表单。
  resetFormInstance,
  // 为 Hydration 的 Suspense 边界注册资源就绪后的重试回调。
  registerSuspenseInstanceRetry,
  // 临时取消普通节点的 View Transition 名称。
  cancelViewTransitionName,
  // 临时取消根容器的 View Transition 名称。
  cancelRootViewTransitionName,
  // 恢复根容器被临时取消的 View Transition 名称。
  restoreRootViewTransitionName,
  // 判断 Singleton 是否是子节点独立操作范围；DOM 中目前只有 head。
  isSingletonScope,
  // Fragment Fiber 更新后，让 Fragment ref 实例指向最新 Fiber。
  updateFragmentInstanceFiber,
} from './ReactFiberConfig';
import {
  captureCommitPhaseError,
  resolveRetryWakeable,
  markCommitTimeOfFallback,
  restorePendingUpdaters,
  addTransitionStartCallbackToPendingTransition,
  addTransitionProgressCallbackToPendingTransition,
  addTransitionCompleteCallbackToPendingTransition,
  addMarkerProgressCallbackToPendingTransition,
  addMarkerIncompleteCallbackToPendingTransition,
  addMarkerCompleteCallbackToPendingTransition,
  retryDehydratedSuspenseBoundary,
  scheduleViewTransitionEvent,
} from './ReactFiberWorkLoop';
import {
  HasEffect as HookHasEffect,
  Layout as HookLayout,
  Insertion as HookInsertion,
  Passive as HookPassive,
} from './ReactHookEffectTags';
import {doesFiberContain} from './ReactFiberTreeReflection';
import {isDevToolsPresent, onCommitUnmount} from './ReactFiberDevToolsHook';
import {releaseCache, retainCache} from './ReactFiberCacheComponent';
import {clearTransitionsForLanes} from './ReactFiberLane';
import {
  OffscreenVisible,
  OffscreenPassiveEffectsConnected,
} from './ReactFiberOffscreenComponent';
import {
  TransitionRoot,
  TransitionTracingMarker,
} from './ReactFiberTracingMarkerComponent';
import {getViewTransitionClassName} from './ReactFiberViewTransitionComponent';
import {
  commitHookLayoutEffects,
  commitHookLayoutUnmountEffects,
  commitHookEffectListMount,
  commitHookEffectListUnmount,
  commitHookPassiveMountEffects,
  commitHookPassiveUnmountEffects,
  commitClassLayoutLifecycles,
  commitClassDidMount,
  commitClassCallbacks,
  commitClassHiddenCallbacks,
  commitClassSnapshot,
  safelyCallComponentWillUnmount,
  safelyAttachRef,
  safelyDetachRef,
  commitProfilerUpdate,
  commitProfilerPostCommit,
  commitRootCallbacks,
} from './ReactFiberCommitEffects';
import {
  commitHostMount,
  commitHostHydratedInstance,
  commitHostUpdate,
  commitHostTextUpdate,
  commitHostResetTextContent,
  commitShowHideSuspenseBoundary,
  commitShowHideHostInstance,
  commitShowHideHostTextInstance,
  commitHostPlacement,
  commitHostRootContainerChildren,
  commitHostPortalContainerChildren,
  commitHostHydratedContainer,
  commitHostHydratedActivity,
  commitHostHydratedSuspense,
  commitHostRemoveChildFromContainer,
  commitHostRemoveChild,
  commitHostSingletonAcquisition,
  commitHostSingletonRelease,
  commitFragmentInstanceDeletionEffects,
  commitFragmentInstanceInsertionEffects,
} from './ReactFiberCommitHostEffects';
import {
  trackEnterViewTransitions,
  commitEnterViewTransitions,
  commitExitViewTransitions,
  commitBeforeUpdateViewTransition,
  commitNestedViewTransitions,
  restoreEnterOrExitViewTransitions,
  restoreUpdateViewTransition,
  restoreNestedViewTransitions,
  measureUpdateViewTransition,
  measureNestedViewTransitions,
  resetAppearingViewTransitions,
  trackAppearingViewTransition,
  viewTransitionCancelableChildren,
  pushViewTransitionCancelableScope,
  popViewTransitionCancelableScope,
} from './ReactFiberCommitViewTransitions';
import {
  viewTransitionMutationContext,
  pushRootMutationContext,
  pushMutationContext,
  popMutationContext,
  rootMutationContext,
} from './ReactFiberMutationTracking';
import {
  trackNamedViewTransition,
  untrackNamedViewTransition,
} from './ReactFiberDuplicateViewTransitions';
import {markIndicatorHandled} from './ReactFiberRootScheduler';
import type {Flags} from './ReactFiberFlags';

// Used during the commit phase to track the state of the Offscreen component stack.
// Allows us to avoid traversing the return path to find the nearest Offscreen ancestor.
// 当前正在提交的 Fiber 是否位于“本次提交后仍然隐藏”的 Offscreen 子树中。
// 用于决定是否延迟回调、跳过 ref/Effect，以及是否隐藏真实宿主节点。
// 本次提交后是否隐藏。
let offscreenSubtreeIsHidden: boolean = false;
// 当前正在提交的 Fiber 是否位于“上一次提交时已经隐藏”的 Offscreen 子树中。
// 用于避免重复清理 ref/Layout Effect，并识别从隐藏恢复显示的子树。
// 上一次提交时是否已经隐藏。
let offscreenSubtreeWasHidden: boolean = false;
// Track whether there's a hidden offscreen above with no HostComponent between. If so,
// it overrides the hiddenness of the HostComponent below.
// 当前 Fiber 上方是否存在尚未被 HostComponent 隔开的隐藏 Offscreen。
// 用于防止内层 Offscreen 想显示时，把仍受外层 Offscreen 控制的 DOM 错误显示出来。
// 是否仍受未被 HostComponent 隔开的外层隐藏 Offscreen 控制。
let offscreenDirectParentIsHidden: boolean = false;

// Used to track if a form needs to be reset at the end of the mutation phase.
let needsFormReset = false;

const PossiblyWeakSet = typeof WeakSet === 'function' ? WeakSet : Set;

let nextEffect: Fiber | null = null;

// Used for Profiling builds to track updaters.
let inProgressLanes: Lanes | null = null;
let inProgressRoot: FiberRoot | null = null;

let focusedInstanceHandle: null | Fiber = null;
export let shouldFireAfterActiveInstanceBlur: boolean = false;

// Used during the commit phase to track whether a parent ViewTransition component
// might have been affected by any mutations / relayouts below.
let viewTransitionContextChanged: boolean = false;
let inUpdateViewTransition: boolean = false;
let rootViewTransitionAffected: boolean = false;
let rootViewTransitionNameCanceled: boolean = false;

function isHydratingParent(current: Fiber, finishedWork: Fiber): boolean {
  if (finishedWork.tag === ActivityComponent) {
    const prevState: ActivityState | null = current.memoizedState;
    const nextState: ActivityState | null = finishedWork.memoizedState;
    return prevState !== null && nextState === null;
  } else if (finishedWork.tag === SuspenseComponent) {
    const prevState: SuspenseState | null = current.memoizedState;
    const nextState: SuspenseState | null = finishedWork.memoizedState;
    return (
      prevState !== null &&
      prevState.dehydrated !== null &&
      (nextState === null || nextState.dehydrated === null)
    );
  } else if (finishedWork.tag === HostRoot) {
    return (
      (current.memoizedState as RootState).isDehydrated &&
      (finishedWork.flags & ForceClientRender) === NoFlags
    );
  } else {
    return false;
  }
}

export function commitBeforeMutationEffects(
  root: FiberRoot,
  firstChild: Fiber,
  committedLanes: Lanes,
): void {
  focusedInstanceHandle = prepareForCommit(root.containerInfo);
  shouldFireAfterActiveInstanceBlur = false;

  const isViewTransitionEligible =
    enableViewTransition &&
    includesOnlyViewTransitionEligibleLanes(committedLanes);

  nextEffect = firstChild;
  commitBeforeMutationEffects_begin(isViewTransitionEligible);

  // We no longer need to track the active instance fiber
  focusedInstanceHandle = null;
  // We've found any matched pairs and can now reset.
  resetAppearingViewTransitions();
}

function commitBeforeMutationEffects_begin(isViewTransitionEligible: boolean) {
  // If this commit is eligible for a View Transition we look into all mutated subtrees.
  // TODO: We could optimize this by marking these with the Snapshot subtree flag in the render phase.
  const subtreeMask = isViewTransitionEligible
    ? BeforeAndAfterMutationTransitionMask
    : BeforeMutationMask;
  while (nextEffect !== null) {
    const fiber = nextEffect;

    // This phase is only used for beforeActiveInstanceBlur.
    // Let's skip the whole loop if it's off.
    if (enableCreateEventHandleAPI || isViewTransitionEligible) {
      // TODO: Should wrap this in flags check, too, as optimization
      const deletions = fiber.deletions;
      if (deletions !== null) {
        for (let i = 0; i < deletions.length; i++) {
          const deletion = deletions[i];
          commitBeforeMutationEffectsDeletion(
            deletion,
            isViewTransitionEligible,
          );
        }
      }
    }

    if (
      enableViewTransition &&
      fiber.alternate === null &&
      (fiber.flags & Placement) !== NoFlags
    ) {
      // Skip before mutation effects of the children because we don't want
      // to trigger updates of any nested view transitions and we shouldn't
      // have any other before mutation effects since snapshot effects are
      // only applied to updates. TODO: Model this using only flags.
      if (isViewTransitionEligible) {
        trackEnterViewTransitions(fiber);
      }
      commitBeforeMutationEffects_complete(isViewTransitionEligible);
      continue;
    }

    // TODO: This should really unify with the switch in commitBeforeMutationEffectsOnFiber recursively.
    if (enableViewTransition && fiber.tag === OffscreenComponent) {
      const isModernRoot =
        disableLegacyMode || (fiber.mode & ConcurrentMode) !== NoMode;
      if (isModernRoot) {
        const current = fiber.alternate;
        const isHidden = fiber.memoizedState !== null;
        if (isHidden) {
          if (
            current !== null &&
            current.memoizedState === null &&
            isViewTransitionEligible
          ) {
            // Was previously mounted as visible but is now hidden.
            commitExitViewTransitions(current);
          }
          // Skip before mutation effects of the children because they're hidden.
          commitBeforeMutationEffects_complete(isViewTransitionEligible);
          continue;
        } else if (current !== null && current.memoizedState !== null) {
          // Was previously mounted as hidden but is now visible.
          // Skip before mutation effects of the children because we don't want
          // to trigger updates of any nested view transitions and we shouldn't
          // have any other before mutation effects since snapshot effects are
          // only applied to updates. TODO: Model this using only flags.
          if (isViewTransitionEligible) {
            trackEnterViewTransitions(fiber);
          }
          commitBeforeMutationEffects_complete(isViewTransitionEligible);
          continue;
        }
      }
    }

    const child = fiber.child;
    if ((fiber.subtreeFlags & subtreeMask) !== NoFlags && child !== null) {
      child.return = fiber;
      nextEffect = child;
    } else {
      if (isViewTransitionEligible) {
        // We are inside an updated subtree. Any mutations that affected the
        // parent HostInstance's layout or set of children (such as reorders)
        // might have also affected the positioning or size of the inner
        // ViewTransitions. Therefore we need to find them inside.
        commitNestedViewTransitions(fiber);
      }
      commitBeforeMutationEffects_complete(isViewTransitionEligible);
    }
  }
}

function commitBeforeMutationEffects_complete(
  isViewTransitionEligible: boolean,
) {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    commitBeforeMutationEffectsOnFiber(fiber, isViewTransitionEligible);

    const sibling = fiber.sibling;
    if (sibling !== null) {
      sibling.return = fiber.return;
      nextEffect = sibling;
      return;
    }

    nextEffect = fiber.return;
  }
}

function commitBeforeMutationEffectsOnFiber(
  finishedWork: Fiber,
  isViewTransitionEligible: boolean,
) {
  const current = finishedWork.alternate;
  const flags = finishedWork.flags;

  if (enableCreateEventHandleAPI) {
    if (!shouldFireAfterActiveInstanceBlur && focusedInstanceHandle !== null) {
      // Check to see if the focused element was inside of a hidden (Suspense) subtree.
      // TODO: Move this out of the hot path using a dedicated effect tag.
      // TODO: This should consider Offscreen in general and not just SuspenseComponent.
      if (
        finishedWork.tag === SuspenseComponent &&
        isSuspenseBoundaryBeingHidden(current, finishedWork) &&
        // $FlowFixMe[incompatible-type] found when upgrading Flow
        doesFiberContain(finishedWork, focusedInstanceHandle)
      ) {
        shouldFireAfterActiveInstanceBlur = true;
        beforeActiveInstanceBlur(finishedWork);
      }
    }
  }

  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      if (!enableEffectEventMutationPhase && (flags & Update) !== NoFlags) {
        const updateQueue: FunctionComponentUpdateQueue | null =
          finishedWork.updateQueue as any;
        const eventPayloads = updateQueue !== null ? updateQueue.events : null;
        if (eventPayloads !== null) {
          for (let ii = 0; ii < eventPayloads.length; ii++) {
            const {ref, nextImpl} = eventPayloads[ii];
            ref.impl = nextImpl;
          }
        }
      }
      break;
    }
    case ClassComponent: {
      if ((flags & Snapshot) !== NoFlags) {
        if (current !== null) {
          commitClassSnapshot(finishedWork, current);
        }
      }
      break;
    }
    case HostRoot: {
      if ((flags & Snapshot) !== NoFlags) {
        // $FlowFixMe[constant-condition]
        if (supportsMutation) {
          const root = finishedWork.stateNode;
          clearContainer(root.containerInfo);
        }
      }
      break;
    }
    case HostComponent:
    case HostHoistable:
    case HostSingleton:
    case HostText:
    case HostPortal:
    case IncompleteClassComponent:
      // Nothing to do for these component types
      break;
    case ViewTransitionComponent:
      if (enableViewTransition) {
        if (isViewTransitionEligible) {
          if (current === null) {
            // This is a new mount. We should have handled this as part of the
            // Placement effect or it is deeper inside a entering transition.
          } else {
            // Something may have mutated within this subtree. This might need to cause
            // a cross-fade of this parent. We first assign old names to the
            // previous tree in the before mutation phase in case we need to.
            // TODO: This walks the tree that we might continue walking anyway.
            // We should just stash the parent ViewTransitionComponent and continue
            // walking the tree until we find HostComponent but to do that we need
            // to use a stack which requires refactoring this phase.
            commitBeforeUpdateViewTransition(current, finishedWork);
          }
        }
        break;
      }
    // Fallthrough
    default: {
      if ((flags & Snapshot) !== NoFlags) {
        throw new Error(
          'This unit of work tag should not have side-effects. This error is ' +
            'likely caused by a bug in React. Please file an issue.',
        );
      }
    }
  }
}

function commitBeforeMutationEffectsDeletion(
  deletion: Fiber,
  isViewTransitionEligible: boolean,
) {
  if (enableCreateEventHandleAPI) {
    // TODO (effects) It would be nice to avoid calling doesFiberContain()
    // Maybe we can repurpose one of the subtreeFlags positions for this instead?
    // Use it to store which part of the tree the focused instance is in?
    // This assumes we can safely determine that instance during the "render" phase.
    if (doesFiberContain(deletion, focusedInstanceHandle as any as Fiber)) {
      shouldFireAfterActiveInstanceBlur = true;
      beforeActiveInstanceBlur(deletion);
    }
  }
  if (isViewTransitionEligible) {
    commitExitViewTransitions(deletion);
  }
}

// 函数组件
// → 执行useLayoutEffect
// Class组件
// → 执行componentDidMount/componentDidUpdate
// → 执行setState回调
// → 绑定ref
// HostComponent
// → 处理首次挂载后的操作，例如autoFocus
// → 处理Hydration完成
// → 绑定DOM ref
// HostRoot
// → 执行Root更新回调
// Suspense/Activity
// → 执行Hydration完成回调
// Offscreen
// → 隐藏时跳过Layout工作
// → 从隐藏恢复显示时调用reappearLayoutEffects
function commitLayoutEffectOnFiber(
  finishedRoot: FiberRoot,
  current: Fiber | null,
  finishedWork: Fiber,
  committedLanes: Lanes,
): void {
  // 记录当前 Fiber 在 Commit阶段执行 Effect时的性能和异常信息。
  const prevEffectStart = pushComponentEffectStart();
  const prevEffectDuration = pushComponentEffectDuration();
  const prevEffectErrors = pushComponentEffectErrors();
  const prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();
  // When updating this function, also update reappearLayoutEffects, which does
  // most of the same things when an offscreen tree goes from hidden -> visible.
  // 标记以下任务：Placement | Update | Ref;
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      // 深度遍历子节点
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      // 如果有更新内容的话
      if (flags & Update) {
        // 执行HookLayout | HookHasEffect两个阶段的effect初始化，保存清理函数
        commitHookLayoutEffects(finishedWork, HookLayout | HookHasEffect);
      }
      break;
    }
    // 类组件
    case ClassComponent: {
      // 深度遍历子节点
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      // 处理类函数的事件钩子
      if (flags & Update) {
        // 执行componentDidMount/componentDidUpdate
        commitClassLayoutLifecycles(finishedWork, current);
      }

      if (flags & Callback) {
        // 执行setState回调函数
        commitClassCallbacks(finishedWork);
      }

      if (flags & Ref) {
        // 绑定ref 支持函数ref，类似effect用法
        safelyAttachRef(finishedWork, finishedWork.return);
      }
      break;
    }
    // 根节点
    case HostRoot: {
      const prevProfilerEffectDuration = pushNestedEffectDurations();
      // 深度遍历子节点
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      if (flags & Callback) {
        // 执行setState回调函数
        commitRootCallbacks(finishedWork);
      }
      if (enableProfilerTimer && enableProfilerCommitHooks) {
        finishedRoot.effectDuration += popNestedEffectDurations(
          prevProfilerEffectDuration,
        );
      }
      break;
    }
    // html head body 节点
    case HostSingleton: {
      // $FlowFixMe[constant-condition]
      if (supportsSingletons) {
        // We acquire the singleton instance first so it has appropriate
        // styles before other layout effects run. This isn't perfect because
        // an early sibling of the singleton may have an effect that can
        // observe the singleton before it is acquired.
        // @TODO move this to the mutation phase. The reason it isn't there yet
        // is it seemingly requires an extra traversal because we need to move the
        // disappear effect into a phase before the appear phase
        if (current === null && flags & Update) {
          // 初始化根节点对象
          // Unlike in the reappear path we only acquire on new mount
          commitHostSingletonAcquisition(finishedWork);
        }
        // We fall through to the HostComponent case below.
      }
      // Fallthrough
    }
    // 提升节点
    case HostHoistable:
    case HostComponent: {
      // 深度遍历组件子节点
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );

      // Renderers may schedule work to be done after host components are mounted
      // (eg DOM renderer may schedule auto-focus for inputs and form controls).
      // These effects should only be committed when components are first mounted,
      // aka when there is no current/alternate.
      // 组件需要新建
      if (current === null) {
        if (flags & Update) {
          // 客户端模式
          // 主要是操作节点的focus和图片的src更新
          commitHostMount(finishedWork);
        } else if (flags & Hydrate) {
          // 对文本选项节点引用默认值和value
          commitHostHydratedInstance(finishedWork);
        }
      }

      if (flags & Ref) {
        // 绑定ref 不过这里的节点是父级
        safelyAttachRef(finishedWork, finishedWork.return);
      }
      break;
    }
    // 性能追踪忽略
    case Profiler: {
      // TODO: Should this fire inside an offscreen tree? Or should it wait to
      // fire when the tree becomes visible again.
      if (flags & Update) {
        const prevProfilerEffectDuration = pushNestedEffectDurations();

        recursivelyTraverseLayoutEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
        );

        const profilerInstance = finishedWork.stateNode;

        if (enableProfilerTimer && enableProfilerCommitHooks) {
          // Propagate layout effect durations to the next nearest Profiler ancestor.
          // Do not reset these values until the next render so DevTools has a chance to read them first.
          profilerInstance.effectDuration += bubbleNestedEffectDurations(
            prevProfilerEffectDuration,
          );
        }

        commitProfilerUpdate(
          finishedWork,
          current,
          commitStartTime,
          profilerInstance.effectDuration,
        );
      } else {
        recursivelyTraverseLayoutEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
        );
      }
      break;
    }
    // toggle组件
    case ActivityComponent: {
      // 递归遍历子节点
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      if (flags & Update) {
        // 处理切换显示的事件绑定之类的
        commitActivityHydrationCallbacks(finishedRoot, finishedWork);
      }
      break;
    }
    case SuspenseComponent: {
      // 递归遍历子节点
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      if (flags & Update) {
        // 初始界面切换的事件绑定之类的，和activity基本一致
        commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
      }
      if (flags & Callback) {
        // This Boundary is in fallback and has a dehydrated Suspense instance.
        // We could in theory assume the dehydrated state but we recheck it for
        // certainty.
        const finishedState: SuspenseState | null = finishedWork.memoizedState;
        // 非空意味着还有一些数据没ready
        if (finishedState !== null) {
          const dehydrated = finishedState.dehydrated;
          if (dehydrated !== null) {
            // Register a callback to retry this boundary once the server has sent the result.
            // 绑定上下文创建重试函数
            const retry = retryDehydratedSuspenseBoundary.bind(
              null,
              finishedWork,
            );
            // 执行callback 兼容suspense 是根节点的场景，DCL后执行界面初始化之类的
            registerSuspenseInstanceRetry(dehydrated, retry);
          }
        }
      }
      break;
    }
    // 主要服务于suspense和activity
    case OffscreenComponent: {
      // 当前是否在并发模式
      const isModernRoot =
        disableLegacyMode || (finishedWork.mode & ConcurrentMode) !== NoMode;
      // 如果是并发模式
      if (isModernRoot) {
        // 数据还没有ready或者说还没到显示的时候
        const isHidden = finishedWork.memoizedState !== null;
        // 现在是否需要隐藏子节点，依赖于父节点显示状态和数据ready
        const newOffscreenSubtreeIsHidden =
          isHidden || offscreenSubtreeIsHidden;
        if (newOffscreenSubtreeIsHidden) {
          // The Offscreen tree is hidden. Skip over its layout effects.
        } else {
          // 如果需要显示节点
          // The Offscreen tree is visible.
          // 存在旧的fiber并且是隐藏状态
          const wasHidden = current !== null && current.memoizedState !== null;
          // 以前是否是隐藏的
          const newOffscreenSubtreeWasHidden =
            wasHidden || offscreenSubtreeWasHidden;
          // 保存上下文状态切换上下文
          const prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden;
          // 外层是否已经隐藏
          const prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
          offscreenSubtreeIsHidden = newOffscreenSubtreeIsHidden;
          offscreenSubtreeWasHidden = newOffscreenSubtreeWasHidden;
          // 如果以前隐藏 
          // 进入当前组件前，外层子树没有隐藏
          if (offscreenSubtreeWasHidden && !prevOffscreenSubtreeWasHidden) {
            // This is the root of a reappearing boundary. As we continue
            // traversing the layout effects, we must also re-mount layout
            // effects that were unmounted when the Offscreen subtree was
            // hidden. So this is a superset of the normal commitLayoutEffects.
            const includeWorkInProgressEffects =
              (finishedWork.subtreeFlags & LayoutMask) !== NoFlags;
              // 递归遍历 恢复之前因为隐藏而停掉的布局相关功能。
            recursivelyTraverseReappearLayoutEffects(
              finishedRoot,
              finishedWork,
              includeWorkInProgressEffects,
            );
            // 性能追踪相关
            if (
              enableProfilerTimer &&
              enableProfilerCommitHooks &&
              enableComponentPerformanceTrack &&
              (finishedWork.mode & ProfileMode) !== NoMode &&
              componentEffectStartTime >= 0 &&
              componentEffectEndTime >= 0 &&
              componentEffectEndTime - componentEffectStartTime > 0.05
            ) {
              logComponentReappeared(
                finishedWork,
                componentEffectStartTime,
                componentEffectEndTime,
              );
            }
          } else {
            // 递归遍历子节点
            recursivelyTraverseLayoutEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
            );
          }
          // 切换上下文
          offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
          offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        }
      } else {
        // 递归遍历子节点
        recursivelyTraverseLayoutEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
        );
      }
      break;
    }
    case ViewTransitionComponent: {
      if (enableViewTransition) {
        if (__DEV__) {
          if (flags & ViewTransitionNamedStatic) {
            trackNamedViewTransition(finishedWork);
          }
        }
        // 深度遍历子节点
        recursivelyTraverseLayoutEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
        );
        if (flags & Ref) {
          // 绑定ref
          safelyAttachRef(finishedWork, finishedWork.return);
        }
        break;
      }
      break;
    }
    case Fragment:
      // 虚拟组件主要是绑定ref
      if (enableFragmentRefs) {
        if (flags & Ref) {
          safelyAttachRef(finishedWork, finishedWork.return);
        }
      }
    // Fallthrough
    default: {
      // 默认模式递归所以子节点
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      break;
    }
  }
  // 性能追踪相关
  if (
    enableProfilerTimer &&
    enableProfilerCommitHooks &&
    enableComponentPerformanceTrack &&
    (finishedWork.mode & ProfileMode) !== NoMode &&
    componentEffectStartTime >= 0 &&
    componentEffectEndTime >= 0
  ) {
    if (componentEffectSpawnedUpdate || componentEffectDuration > 0.05) {
      logComponentEffect(
        finishedWork,
        componentEffectStartTime,
        componentEffectEndTime,
        componentEffectDuration,
        componentEffectErrors,
      );
    }
    if (
      // Insertion
      finishedWork.alternate === null &&
      finishedWork.return !== null &&
      finishedWork.return.alternate !== null &&
      componentEffectEndTime - componentEffectStartTime > 0.05
    ) {
      const isHydration = isHydratingParent(
        finishedWork.return.alternate,
        finishedWork.return,
      );
      if (!isHydration) {
        logComponentMount(
          finishedWork,
          componentEffectStartTime,
          componentEffectEndTime,
        );
      }
    }
  }
  // 性能追踪相关
  popComponentEffectStart(prevEffectStart);
  popComponentEffectDuration(prevEffectDuration);
  popComponentEffectErrors(prevEffectErrors);
  popComponentEffectDidSpawnUpdate(prevEffectDidSpawnUpdate);
}

function abortRootTransitions(
  root: FiberRoot,
  abort: TransitionAbort,
  deletedTransitions: Set<Transition>,
  deletedOffscreenInstance: OffscreenInstance | null,
  isInDeletedTree: boolean,
) {
  if (enableTransitionTracing) {
    const rootTransitions = root.incompleteTransitions;
    deletedTransitions.forEach(transition => {
      if (rootTransitions.has(transition)) {
        const transitionInstance: TracingMarkerInstance = rootTransitions.get(
          transition,
        ) as any;
        if (transitionInstance.aborts === null) {
          transitionInstance.aborts = [];
        }
        transitionInstance.aborts.push(abort);

        if (deletedOffscreenInstance !== null) {
          if (
            transitionInstance.pendingBoundaries !== null &&
            transitionInstance.pendingBoundaries.has(deletedOffscreenInstance)
          ) {
            // $FlowFixMe[incompatible-use] found when upgrading Flow
            transitionInstance.pendingBoundaries.delete(
              deletedOffscreenInstance,
            );
          }
        }
      }
    });
  }
}

function abortTracingMarkerTransitions(
  abortedFiber: Fiber,
  abort: TransitionAbort,
  deletedTransitions: Set<Transition>,
  deletedOffscreenInstance: OffscreenInstance | null,
  isInDeletedTree: boolean,
) {
  if (enableTransitionTracing) {
    const markerInstance: TracingMarkerInstance = abortedFiber.stateNode;
    const markerTransitions = markerInstance.transitions;
    const pendingBoundaries = markerInstance.pendingBoundaries;
    if (markerTransitions !== null) {
      // TODO: Refactor this code. Is there a way to move this code to
      // the deletions phase instead of calculating it here while making sure
      // complete is called appropriately?
      deletedTransitions.forEach(transition => {
        // If one of the transitions on the tracing marker is a transition
        // that was in an aborted subtree, we will abort that tracing marker
        if (
          // $FlowFixMe[invalid-compare]
          abortedFiber !== null &&
          markerTransitions.has(transition) &&
          (markerInstance.aborts === null ||
            !markerInstance.aborts.includes(abort))
        ) {
          if (markerInstance.transitions !== null) {
            if (markerInstance.aborts === null) {
              markerInstance.aborts = [abort];
              addMarkerIncompleteCallbackToPendingTransition(
                abortedFiber.memoizedProps.name,
                markerInstance.transitions,
                markerInstance.aborts,
              );
            } else {
              markerInstance.aborts.push(abort);
            }

            // We only want to call onTransitionProgress when the marker hasn't been
            // deleted
            if (
              deletedOffscreenInstance !== null &&
              !isInDeletedTree &&
              pendingBoundaries !== null &&
              pendingBoundaries.has(deletedOffscreenInstance)
            ) {
              pendingBoundaries.delete(deletedOffscreenInstance);

              addMarkerProgressCallbackToPendingTransition(
                abortedFiber.memoizedProps.name,
                deletedTransitions,
                pendingBoundaries,
              );
            }
          }
        }
      });
    }
  }
}

function abortParentMarkerTransitionsForDeletedFiber(
  abortedFiber: Fiber,
  abort: TransitionAbort,
  deletedTransitions: Set<Transition>,
  deletedOffscreenInstance: OffscreenInstance | null,
  isInDeletedTree: boolean,
) {
  if (enableTransitionTracing) {
    // Find all pending markers that are waiting on child suspense boundaries in the
    // aborted subtree and cancels them
    let fiber: null | Fiber = abortedFiber;
    while (fiber !== null) {
      switch (fiber.tag) {
        case TracingMarkerComponent:
          abortTracingMarkerTransitions(
            fiber,
            abort,
            deletedTransitions,
            deletedOffscreenInstance,
            isInDeletedTree,
          );
          break;
        case HostRoot:
          const root = fiber.stateNode;
          abortRootTransitions(
            root,
            abort,
            deletedTransitions,
            deletedOffscreenInstance,
            isInDeletedTree,
          );

          break;
        default:
          break;
      }

      fiber = fiber.return;
    }
  }
}

function commitTransitionProgress(offscreenFiber: Fiber) {
  if (enableTransitionTracing) {
    // This function adds suspense boundaries to the root
    // or tracing marker's pendingBoundaries map.
    // When a suspense boundary goes from a resolved to a fallback
    // state we add the boundary to the map, and when it goes from
    // a fallback to a resolved state, we remove the boundary from
    // the map.

    // We use stateNode on the Offscreen component as a stable object
    // that doesnt change from render to render. This way we can
    // distinguish between different Offscreen instances (vs. the same
    // Offscreen instance with different fibers)
    const offscreenInstance: OffscreenInstance = offscreenFiber.stateNode;

    let prevState: SuspenseState | null = null;
    const previousFiber = offscreenFiber.alternate;
    if (previousFiber !== null && previousFiber.memoizedState !== null) {
      prevState = previousFiber.memoizedState;
    }
    const nextState: SuspenseState | null = offscreenFiber.memoizedState;

    const wasHidden = prevState !== null;
    const isHidden = nextState !== null;

    const pendingMarkers = offscreenInstance._pendingMarkers;
    // If there is a name on the suspense boundary, store that in
    // the pending boundaries.
    let name = null;
    const parent = offscreenFiber.return;
    if (
      parent !== null &&
      parent.tag === SuspenseComponent &&
      parent.memoizedProps.name
    ) {
      name = parent.memoizedProps.name;
    }

    if (!wasHidden && isHidden) {
      // The suspense boundaries was just hidden. Add the boundary
      // to the pending boundary set if it's there
      if (pendingMarkers !== null) {
        pendingMarkers.forEach(markerInstance => {
          const pendingBoundaries = markerInstance.pendingBoundaries;
          const transitions = markerInstance.transitions;
          const markerName = markerInstance.name;
          if (
            pendingBoundaries !== null &&
            !pendingBoundaries.has(offscreenInstance)
          ) {
            pendingBoundaries.set(offscreenInstance, {
              name,
            });
            if (transitions !== null) {
              if (
                markerInstance.tag === TransitionTracingMarker &&
                markerName !== null
              ) {
                addMarkerProgressCallbackToPendingTransition(
                  markerName,
                  transitions,
                  pendingBoundaries,
                );
              } else if (markerInstance.tag === TransitionRoot) {
                transitions.forEach(transition => {
                  addTransitionProgressCallbackToPendingTransition(
                    transition,
                    pendingBoundaries,
                  );
                });
              }
            }
          }
        });
      }
    } else if (wasHidden && !isHidden) {
      // The suspense boundary went from hidden to visible. Remove
      // the boundary from the pending suspense boundaries set
      // if it's there
      if (pendingMarkers !== null) {
        pendingMarkers.forEach(markerInstance => {
          const pendingBoundaries = markerInstance.pendingBoundaries;
          const transitions = markerInstance.transitions;
          const markerName = markerInstance.name;
          if (
            pendingBoundaries !== null &&
            pendingBoundaries.has(offscreenInstance)
          ) {
            pendingBoundaries.delete(offscreenInstance);
            if (transitions !== null) {
              if (
                markerInstance.tag === TransitionTracingMarker &&
                markerName !== null
              ) {
                addMarkerProgressCallbackToPendingTransition(
                  markerName,
                  transitions,
                  pendingBoundaries,
                );

                // If there are no more unresolved suspense boundaries, the interaction
                // is considered finished
                if (pendingBoundaries.size === 0) {
                  if (markerInstance.aborts === null) {
                    addMarkerCompleteCallbackToPendingTransition(
                      markerName,
                      transitions,
                    );
                  }
                  markerInstance.transitions = null;
                  markerInstance.pendingBoundaries = null;
                  markerInstance.aborts = null;
                }
              } else if (markerInstance.tag === TransitionRoot) {
                transitions.forEach(transition => {
                  addTransitionProgressCallbackToPendingTransition(
                    transition,
                    pendingBoundaries,
                  );
                });
              }
            }
          }
        });
      }
    }
  }
}

// 递归设置组件的显示状态
function hideOrUnhideAllChildren(parentFiber: Fiber, isHidden: boolean) {
  // $FlowFixMe[constant-condition]
  if (!supportsMutation) {
    return;
  }
  // Finds the nearest host component children and updates their visibility
  // to either hidden or visible.
  // 深度遍历执行
  let child = parentFiber.child;
  while (child !== null) {
    hideOrUnhideAllChildrenOnFiber(child, isHidden);
    child = child.sibling;
  }
}

// 对于dom组件来说就是设置display显示还是不显示
function hideOrUnhideAllChildrenOnFiber(fiber: Fiber, isHidden: boolean) {
  // $FlowFixMe[constant-condition]
  if (!supportsMutation) {
    return;
  }
  switch (fiber.tag) {
    case HostComponent:
    case HostHoistable: {
      // Found the nearest host component. Hide it.
      commitShowHideHostInstance(fiber, isHidden);
      // Typically, only the nearest host nodes need to be hidden, since that
      // has the effect of also hiding everything inside of them.
      //
      // However, there's a special case for portals, because portals do not
      // exist in the regular host tree hierarchy; we can't assume that just
      // because a portal's HostComponent parent in the React tree will also be
      // a parent in the actual host tree.
      //
      // So, if any portals exist within the tree, regardless of how deeply
      // nested they are, we need to repeat this algorithm for its children.
      hideOrUnhideNearestPortals(fiber, isHidden);
      return;
    }
    case HostText: {
      commitShowHideHostTextInstance(fiber, isHidden);
      return;
    }
    case DehydratedFragment: {
      commitShowHideSuspenseBoundary(fiber, isHidden);
      return;
    }
    case OffscreenComponent:
    case LegacyHiddenComponent: {
      const offscreenState: OffscreenState | null = fiber.memoizedState;
      if (offscreenState !== null) {
        // Found a nested Offscreen component that is hidden.
        // Don't search any deeper. This tree should remain hidden.
      } else {
        hideOrUnhideAllChildren(fiber, isHidden);
      }
      return;
    }
    default: {
      hideOrUnhideAllChildren(fiber, isHidden);
      return;
    }
  }
}

function hideOrUnhideNearestPortals(parentFiber: Fiber, isHidden: boolean) {
  // $FlowFixMe[constant-condition]
  if (!supportsMutation) {
    return;
  }
  if (parentFiber.subtreeFlags & PortalStatic) {
    let child = parentFiber.child;
    while (child !== null) {
      hideOrUnhideNearestPortalsOnFiber(child, isHidden);
      child = child.sibling;
    }
  }
}

function hideOrUnhideNearestPortalsOnFiber(fiber: Fiber, isHidden: boolean) {
  // $FlowFixMe[constant-condition]
  if (!supportsMutation) {
    return;
  }
  switch (fiber.tag) {
    case HostPortal: {
      // Found a portal. Switch back to the normal hide/unhide algorithm to
      // toggle the visibility of its children.
      hideOrUnhideAllChildrenOnFiber(fiber, isHidden);
      return;
    }
    case OffscreenComponent: {
      const offscreenState: OffscreenState | null = fiber.memoizedState;
      if (offscreenState !== null) {
        // Found a nested Offscreen component that is hidden. Don't search any
        // deeper. This tree should remain hidden.
      } else {
        hideOrUnhideNearestPortals(fiber, isHidden);
      }
      return;
    }
    default: {
      hideOrUnhideNearestPortals(fiber, isHidden);
      return;
    }
  }
}


// 清空父节点和双缓存节点的链表引用
function detachFiberMutation(fiber: Fiber) {
  // Cut off the return pointer to disconnect it from the tree.
  // This enables us to detect and warn against state updates on an unmounted component.
  // It also prevents events from bubbling from within disconnected components.
  //
  // Ideally, we should also clear the child pointer of the parent alternate to let this
  // get GC:ed but we don't know which for sure which parent is the current
  // one so we'll settle for GC:ing the subtree of this child.
  // This child itself will be GC:ed when the parent updates the next time.
  //
  // Note that we can't clear child or sibling pointers yet.
  // They're needed for passive effects and for findDOMNode.
  // We defer those fields, and all other cleanup, to the passive phase (see detachFiberAfterEffects).
  //
  // Don't reset the alternate yet, either. We need that so we can detach the
  // alternate's fields in the passive phase. Clearing the return pointer is
  // sufficient for findDOMNode semantics.
  const alternate = fiber.alternate;
  if (alternate !== null) {
    alternate.return = null;
  }
  fiber.return = null;
}


// 清空fiber节点上的所有引用对象，便于gc
function detachFiberAfterEffects(fiber: Fiber) {
  // 获取双缓存的节点、 因为节点要删除了，所以要清空
  const alternate = fiber.alternate;
  if (alternate !== null) {
    fiber.alternate = null;
    // 递归自身
    detachFiberAfterEffects(alternate);
  }

  // Clear cyclical Fiber fields. This level alone is designed to roughly
  // approximate the planned Fiber refactor. In that world, `setState` will be
  // bound to a special "instance" object instead of a Fiber. The Instance
  // object will not have any of these fields. It will only be connected to
  // the fiber tree via a single link at the root. So if this level alone is
  // sufficient to fix memory issues, that bodes well for our plans.
  // 清空引用
  fiber.child = null;
  fiber.deletions = null;
  fiber.sibling = null;

  // The `stateNode` is cyclical because on host nodes it points to the host
  // tree, which has its own pointers to children, parents, and siblings.
  // The other host nodes also point back to fibers, so we should detach that
  // one, too.
  if (fiber.tag === HostComponent) {
    const hostInstance: Instance = fiber.stateNode;
    // $FlowFixMe[invalid-compare]
    if (hostInstance !== null) {
    // 清理对象上的缓存属性
      detachDeletedInstance(hostInstance);
    }
  }
  fiber.stateNode = null;

  if (__DEV__) {
    fiber._debugOwner = null;
  }

  // Theoretically, nothing in here should be necessary, because we already
  // disconnected the fiber from the tree. So even if something leaks this
  // particular fiber, it won't leak anything else.
  fiber.return = null;
  fiber.dependencies = null;
  fiber.memoizedProps = null;
  fiber.memoizedState = null;
  fiber.pendingProps = null;
  fiber.stateNode = null;
  // TODO: Move to `commitPassiveUnmountInsideDeletedTreeOnFiber` instead.
  fiber.updateQueue = null;
}

// These are tracked on the stack as we recursively traverse a
// deleted subtree.
// TODO: Update these during the whole mutation phase, not just during
// a deletion.
let hostParent: Instance | Container | null = null;
let hostParentIsContainer: boolean = false;


// 执行effect清理
function commitDeletionEffects(
  root: FiberRoot,
  returnFiber: Fiber,
  deletedFiber: Fiber,
) {
  // 性能追踪
  const prevEffectStart = pushComponentEffectStart();

  // $FlowFixMe[constant-condition]
  if (supportsMutation) {
    // We only have the top Fiber that was deleted but we need to recurse down its
    // children to find all the terminal nodes.

    // Recursively delete all host nodes from the parent, detach refs, clean
    // up mounted layout effects, and call componentWillUnmount.

    // We only need to remove the topmost host child in each branch. But then we
    // still need to keep traversing to unmount effects, refs, and cWU. TODO: We
    // could split this into two separate traversals functions, where the second
    // one doesn't include any removeChild logic. This is maybe the same
    // function as "disappearLayoutEffects" (or whatever that turns into after
    // the layout phase is refactored to use recursion).

    // Before starting, find the nearest host parent on the stack so we know
    // which instance/container to remove the children from.
    // TODO: Instead of searching up the fiber return path on every deletion, we
    // can track the nearest host component on the JS stack as we traverse the
    // tree during the commit phase. This would make insertions faster, too.
    let parent: null | Fiber = returnFiber;
    // 命名标记
    findParent: while (parent !== null) {
      switch (parent.tag) {
        // html head之类的 节点
        case HostSingleton: {
          // $FlowFixMe[constant-condition]
          if (supportsSingletons) {
            if (isSingletonScope(parent.type)) {
              // 设置共享状态
              hostParent = parent.stateNode;
              hostParentIsContainer = false;
              break findParent;
            }
            break;
          }
          // Expected fallthrough when supportsSingletons is false
        }
        case HostComponent: {
          hostParent = parent.stateNode;
          hostParentIsContainer = false;
          break findParent;
        }
        case HostRoot:
        case HostPortal: {
          // 实际挂在的dom节点
          hostParent = parent.stateNode.containerInfo;
          hostParentIsContainer = true;
          break findParent;
        }
      }
      // 向上递归
      parent = parent.return;
    }
    if (hostParent === null) {
      throw new Error(
        'Expected to find a host parent. This error is likely caused by ' +
          'a bug in React. Please file an issue.',
      );
    }
    // 处理Fiber被删除时，需要执行的卸载工作
    commitDeletionEffectsOnFiber(root, returnFiber, deletedFiber);
    hostParent = null;
    hostParentIsContainer = false;
  } else {
    // Detach refs and call componentWillUnmount() on the whole subtree.
    // 处理Fiber被删除时，需要执行的卸载工作
    commitDeletionEffectsOnFiber(root, returnFiber, deletedFiber);
  }
  // 性能追踪
  if (
    enableProfilerTimer &&
    enableProfilerCommitHooks &&
    enableComponentPerformanceTrack &&
    (deletedFiber.mode & ProfileMode) !== NoMode &&
    componentEffectStartTime >= 0 &&
    componentEffectEndTime >= 0 &&
    componentEffectEndTime - componentEffectStartTime > 0.05
  ) {
    logComponentUnmount(
      deletedFiber,
      componentEffectStartTime,
      componentEffectEndTime,
    );
  }
  // 性能追中
  popComponentEffectStart(prevEffectStart);
  // 清空父节点和双缓存节点的链表引用
  detachFiberMutation(deletedFiber);
}

function recursivelyTraverseDeletionEffects(
  finishedRoot: FiberRoot,
  nearestMountedAncestor: Fiber,
  parent: Fiber,
) {
  // TODO: Use a static flag to skip trees that don't have unmount effects
  let child = parent.child;
  while (child !== null) {
    commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, child);
    child = child.sibling;
  }
}

// 递归处理单个待删除 Fiber：执行卸载逻辑，并根据节点类型删除宿主节点或资源。
function commitDeletionEffectsOnFiber(
  finishedRoot: FiberRoot,
  nearestMountedAncestor: Fiber,
  deletedFiber: Fiber,
) {
  // TODO: Delete this Hook once new DevTools ships everywhere. No longer needed.
  // 通知 DevTools 当前 Fiber 正在卸载。
  onCommitUnmount(deletedFiber);

  const prevEffectStart = pushComponentEffectStart();
  const prevEffectDuration = pushComponentEffectDuration();
  const prevEffectErrors = pushComponentEffectErrors();
  const prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();

  // The cases in this outer switch modify the stack before they traverse
  // into their subtree. There are simpler cases in the inner switch
  // that don't modify the stack.
  switch (deletedFiber.tag) {
    // 处理会提升到 document.head 等位置的节点，例如 title、meta、link。
    case HostHoistable: {
      // $FlowFixMe[constant-condition]
      // 当前渲染器支持资源管理时使用专门的卸载流程。
      if (supportsResources) {
        // 已隐藏的 Offscreen 子树之前已经处理过 ref，避免重复解绑。
        if (!offscreenSubtreeWasHidden) {
          // 清理ref
          safelyDetachRef(deletedFiber, nearestMountedAncestor);
        }
        // 对兄弟节点执行本函数的递归清理
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber,
        );
        // 计数自减
        if (deletedFiber.memoizedState) {
          releaseResource(deletedFiber.memoizedState);
        // 在父级节点调用removeChild 移除stateNode子节点 移除dom节点
        } else if (deletedFiber.stateNode) {
          unmountHoistable(deletedFiber.stateNode);
        }
        // 当前类型处理完成，不再进入后面的 HostComponent 分支。
        break;
      }
      // Fall through
    }
    // 处理 html、head、body 等页面中只能存在一个的宿主节点。
    case HostSingleton: {
      // $FlowFixMe[constant-condition]
      if (supportsSingletons) {
        // 子树之前未隐藏时，解绑 Singleton 上的 ref。
        if (!offscreenSubtreeWasHidden) {
          // 清理ref
          safelyDetachRef(deletedFiber, nearestMountedAncestor);
        }

        // 保存进入 Singleton 子树前的宿主父节点信息。
        const prevHostParent = hostParent;
        const prevHostParentIsContainer = hostParentIsContainer;
        // 如果 Singleton 自己是子节点的宿主作用域，将它作为新的删除父节点。
        if (isSingletonScope(deletedFiber.type)) {
          hostParent = deletedFiber.stateNode;
          hostParentIsContainer = false;
        }
        // 递归卸载 Singleton 兄弟节点和子节点。
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber,
        );

        // Normally this is called in passive unmount effect phase however with
        // HostSingleton we warn if you acquire one that is already associated to
        // a different fiber. To increase our chances of avoiding this, specifically
        // if you keyed a HostSingleton so there will be a delete followed by a Placement
        // we treat detach eagerly here
        // 清理对象上的所有属性和缓存数据
        commitHostSingletonRelease(deletedFiber);

        // 离开 Singleton 子树，恢复外层宿主父节点信息。
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;

        break;
      }
      // Fall through
    }
    // 处理 div、span、button 等真实 DOM 节点。
    case HostComponent: {
      // 已隐藏子树的 ref 之前已经解绑；正常删除时在这里解绑。
      if (!offscreenSubtreeWasHidden) {
        // 清理ref
        safelyDetachRef(deletedFiber, nearestMountedAncestor);
      }
      // 开启 Fragment ref 时，从 Fragment 实例记录中移除当前宿主节点。
      if (
        enableFragmentRefs &&
        (deletedFiber.tag === HostComponent ||
          (enableFragmentRefsTextNodes && deletedFiber.tag === HostText))
      ) {
        // 遍历父级Fragment，。清理时间监听和移除实例
        commitFragmentInstanceDeletionEffects(deletedFiber);
      }
      // Intentional fallthrough to next branch
    }
    // HostComponent 继续进入这里；HostText 也使用相同的宿主删除流程。
    case HostText: {
      // We only need to remove the nearest host child. Set the host parent
      // to `null` on the stack to indicate that nested children don't
      // need to be removed.
      // $FlowFixMe[constant-condition]
      // Mutation 渲染器直接调用 removeChild 修改宿主树。
      if (supportsMutation) {
        // 保存当前真正要删除节点的宿主父节点。
        const prevHostParent = hostParent;
        const prevHostParentIsContainer = hostParentIsContainer;
        // 当前 DOM 被删除后，其内部 DOM 会由浏览器一起删除；
        // 设置为 null，避免递归时再次逐个 removeChild。
        hostParent = null;
        // DOM 只删除最外层，但仍需遍历后代执行 Effect、ref 和生命周期清理。
        // 递归处理子节点
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber,
        );
        // 后代清理结束，恢复当前 DOM 对应的真实宿主父节点。
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;

        // 找到了外部宿主父节点时，删除当前最外层 DOM。
        if (hostParent !== null) {
          // Now that all the child effects have unmounted, we can remove the
          // node from the tree.
          // 父节点是 Root 或 Portal 容器。
          if (hostParentIsContainer) {
            // 移除stateNode节点，真实dom移除 区别在于此处的父级节点可能是特殊节点，像html之类的
            commitHostRemoveChildFromContainer(
              deletedFiber,
              nearestMountedAncestor,
              hostParent as any as Container,
              deletedFiber.stateNode as Instance | TextInstance,
            );
          } else {
            // 父节点是普通 HostComponent DOM。
            commitHostRemoveChild(
              deletedFiber,
              nearestMountedAncestor,
              hostParent as any as Instance,
              deletedFiber.stateNode as Instance | TextInstance,
            );
          }
        }
      } else {
        // Persistence 渲染器不在这里直接 removeChild，但仍需递归执行卸载逻辑。
        // 递归处理子节点
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber,
        );
      }
      break;
    }
    // 处理尚未完成客户端 Hydration 的服务端 Suspense/Activity 占位区域。
    case DehydratedFragment: {
      // 开启 Suspense 删除回调时，通知宿主环境该服务端边界被删除。
      if (enableSuspenseCallback) {
        const hydrationCallbacks = finishedRoot.hydrationCallbacks;
        if (hydrationCallbacks !== null) {
          try {
            const onDeleted = hydrationCallbacks.onDeleted;
            if (onDeleted) {
              // 将被删除的服务端 Suspense 或 Activity 实例传给回调。
              // 执行onDelete回调
              onDeleted(
                deletedFiber.stateNode as SuspenseInstance | ActivityInstance,
              );
            }
          } catch (error) {
            // 删除回调报错时交给最近仍挂载的错误边界处理。
            captureCommitPhaseError(
              deletedFiber,
              nearestMountedAncestor,
              error,
            );
          }
        }
      }

      // Dehydrated fragments don't have any children

      // Delete the dehydrated suspense boundary and all of its content.
      // $FlowFixMe[constant-condition]
      if (supportsMutation) {
        if (hostParent !== null) {
          // 边界直接位于 Root/Portal 容器下，从容器中清除整段服务端内容。
          if (hostParentIsContainer) {
            clearSuspenseBoundaryFromContainer(
              hostParent as any as Container,
              deletedFiber.stateNode as SuspenseInstance,
            );
          } else {
            // 边界位于普通 DOM 下，从该 DOM 中清除整段服务端内容。
            // 清理一些节点和执行阻塞的回调之类的
            clearSuspenseBoundary(
              hostParent as any as Instance,
              deletedFiber.stateNode as SuspenseInstance,
            );
          }
        }
      }
      break;
    }
    // 处理通过 createPortal 渲染到其他容器中的子树。
    case HostPortal: {
      // $FlowFixMe[constant-condition]
      if (supportsMutation) {
        // When we go into a portal, it becomes the parent to remove from.
        // 保存外层宿主父节点，进入 Portal 后删除目标需要切换到 Portal 容器。
        const prevHostParent = hostParent;
        const prevHostParentIsContainer = hostParentIsContainer;
        hostParent = deletedFiber.stateNode.containerInfo;
        hostParentIsContainer = true;
        // 从 Portal 容器中递归删除节点并执行卸载逻辑。
        // 遍历清理子节点
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber,
        );
        // 离开 Portal，恢复外层宿主父节点。
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;
      } else {
        // $FlowFixMe[constant-condition]
        // Persistence 渲染器用空子节点集合替换 Portal 原有内容。
        if (supportsPersistence) {
          // 更新children节点
          commitHostPortalContainerChildren(
            deletedFiber.stateNode,
            deletedFiber,
            // 创建新的children节点 大多是个空数组
            createContainerChildSet(),
          );
        }

        // 无论渲染器模式如何，都需要递归执行组件卸载逻辑。
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber,
        );
      }
      break;
    }
    // 处理函数组件及其包装类型。
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent: {
      // TODO: Use a commitHookInsertionUnmountEffects wrapper to record timings.
      // 执行该函数组件所有 useInsertionEffect 的清理函数。
      commitHookEffectListUnmount(
        HookInsertion,
        deletedFiber,
        nearestMountedAncestor,
      );
      // 已隐藏的 Offscreen 子树之前已经断开 Layout Effect，避免再次清理。
      if (!offscreenSubtreeWasHidden) {
        // 执行该函数组件所有 useLayoutEffect 的清理函数。
        // 在commitHookEffectListUnmount基础上多一层profile处理
        commitHookLayoutUnmountEffects(
          deletedFiber,
          nearestMountedAncestor,
          HookLayout,
        );
      }
      // 继续清理函数组件返回的子 Fiber。
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber,
      );
      break;
    }
    // 处理 class 组件。
    case ClassComponent: {
      // 已隐藏子树之前已经处理过布局卸载逻辑。
      if (!offscreenSubtreeWasHidden) {
        // 解绑 class 组件的 ref。
        safelyDetachRef(deletedFiber, nearestMountedAncestor);
        // 获取 class 组件实例。
        const instance = deletedFiber.stateNode;
        // 组件实现了 componentWillUnmount 时执行卸载生命周期。
        // 执行回调
        if (typeof instance.componentWillUnmount === 'function') {
          // 执行comWillUnmount
          safelyCallComponentWillUnmount(
            deletedFiber,
            nearestMountedAncestor,
            instance,
          );
        }
      }
      // 继续清理 class 组件渲染出的子 Fiber。
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber,
      );
      break;
    }
    // 处理实验性的 Scope 节点。
    case ScopeComponent: {
      // 只有开启 Scope API 时才需要处理它的 ref。
      if (enableScopeAPI) {
        if (!offscreenSubtreeWasHidden) {
          safelyDetachRef(deletedFiber, nearestMountedAncestor);
        }
      }
      // Scope 本身没有宿主删除逻辑，继续清理其子树。
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber,
      );
      break;
    }
    // 处理 Activity/Offscreen 隐藏子树的删除。
    case OffscreenComponent: {
      // Concurrent 模式需要记录这棵子树之前是否已经隐藏。
      if (disableLegacyMode || deletedFiber.mode & ConcurrentMode) {
        // If this offscreen component is hidden, we already unmounted it. Before
        // deleting the children, track that it's already unmounted so that we
        // don't attempt to unmount the effects again.
        // TODO: If the tree is hidden, in most cases we should be able to skip
        // over the nested children entirely. An exception is we haven't yet found
        // the topmost host node to delete, which we already track on the stack.
        // But the other case is portals, which need to be detached no matter how
        // deeply they are nested. We should use a subtree flag to track whether a
        // subtree includes a nested portal.
        // 保存外层 Offscreen 的隐藏状态。
        const prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
        // 外层已隐藏或当前 Offscreen 已隐藏，都表示内部 Effect 曾执行过隐藏清理。
        offscreenSubtreeWasHidden =
          prevOffscreenSubtreeWasHidden || deletedFiber.memoizedState !== null;

        // 带着隐藏状态递归删除子树，避免重复解绑 ref 和 Layout Effect。
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber,
        );
        // 离开当前 Offscreen 后恢复外层隐藏状态。
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
      } else {
        // Legacy 模式不维护上述隐藏栈，直接递归清理。
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber,
        );
      }
      break;
    }
    // 处理 React ViewTransition 边界。
    case ViewTransitionComponent: {
      // ViewTransition 功能开启时清理其开发记录、ref 和子树。
      if (enableViewTransition) {
        if (__DEV__) {
          // 显式命名的 ViewTransition 被卸载后，从 DEV 名称追踪表中移除。
          if (deletedFiber.flags & ViewTransitionNamedStatic) {
            untrackNamedViewTransition(deletedFiber);
          }
        }
        // 解绑 ViewTransition 对外暴露的 ref。
        safelyDetachRef(deletedFiber, nearestMountedAncestor);
        // 继续清理 ViewTransition 内部子树。
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber,
        );
        break;
      }
      // Fallthrough
    }
    // 处理 Fragment；开启 Fragment ref 时需要额外解绑 ref。
    case Fragment: {
      if (enableFragmentRefs) {
        // 已隐藏子树的 Fragment ref 之前已经解绑。
        if (!offscreenSubtreeWasHidden) {
          safelyDetachRef(deletedFiber, nearestMountedAncestor);
        }
        // Fragment 没有自己的 DOM，继续递归清理子节点。
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber,
        );
        break;
      }
      // Fallthrough
    }
    // Context、SuspenseList 等没有专用删除逻辑的 Fiber 走通用递归。
    default: {
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber,
      );
      break;
    }
  }
  
  // 满足性能追踪条件，并且卸载耗时明显或产生了更新时，记录当前组件的卸载 Effect。
  if (
    enableProfilerTimer &&
    enableProfilerCommitHooks &&
    enableComponentPerformanceTrack &&
    (deletedFiber.mode & ProfileMode) !== NoMode &&
    componentEffectStartTime >= 0 &&
    componentEffectEndTime >= 0 &&
    (componentEffectSpawnedUpdate || componentEffectDuration > 0.05)
  ) {
    logComponentEffect(
      deletedFiber,
      componentEffectStartTime,
      componentEffectEndTime,
      componentEffectDuration,
      componentEffectErrors,
    );
  }
  // 当前 Fiber 处理完成，恢复进入该 Fiber 前保存的性能统计上下文。
  popComponentEffectStart(prevEffectStart);
  // 恢复外层组件累计的 Effect 执行耗时。
  popComponentEffectDuration(prevEffectDuration);
  // 恢复外层组件收集的 Commit 错误。
  popComponentEffectErrors(prevEffectErrors);
  // 恢复外层组件“Effect 中是否产生更新”的记录。
  popComponentEffectDidSpawnUpdate(prevEffectDidSpawnUpdate);
}

// 保存所有的更新回调到suspenseCallback里面
function commitSuspenseCallback(finishedWork: Fiber) {
  // TODO: Delete this feature. It's not properly covered by DEV features.
  const newState: SuspenseState | null = finishedWork.memoizedState;
  if (enableSuspenseCallback && newState !== null) {
    const suspenseCallback = finishedWork.memoizedProps.suspenseCallback;
    if (typeof suspenseCallback === 'function') {
      const retryQueue: RetryQueue | null = finishedWork.updateQueue as any;
      if (retryQueue !== null) {
        suspenseCallback(new Set(retryQueue));
      }
    } else if (__DEV__) {
      if (suspenseCallback !== undefined) {
        console.error('Unexpected type for suspenseCallback.');
      }
    }
  }
}


// 执行组件从隐藏切换到显示后事件之类的初始化，以及执行onHydrated回调
function commitActivityHydrationCallbacks(
  finishedRoot: FiberRoot,
  finishedWork: Fiber,
) {
  // $FlowFixMe[constant-condition]
  if (!supportsHydration) {
    return;
  }
  const newState: ActivityState | null = finishedWork.memoizedState;
  // 新的state为空
  if (newState === null) {
    const current = finishedWork.alternate;
    // 备用节点非空
    if (current !== null) {
      // 获取旧的state节点
      const prevState: ActivityState | null = current.memoizedState;
      // 如果以前非空，就是意思之前隐藏的   隐藏的时候才会有这个state对象
      // 之前隐藏，现在就切换为显示
      // 显示的时候dom复用，所以要进行相关的事件初始化之类的
      if (prevState !== null) {
        const activityInstance = prevState.dehydrated;
        // dom复用后执行初始化
        commitHostHydratedActivity(activityInstance, finishedWork);
        if (enableSuspenseCallback) {
          try {
            // TODO: Delete this feature. It's not properly covered by DEV features.
            const hydrationCallbacks = finishedRoot.hydrationCallbacks;
            if (hydrationCallbacks !== null) {
              const onHydrated = hydrationCallbacks.onHydrated;
              // 执行onHydrated回调函数
              if (onHydrated) {
                onHydrated(activityInstance);
              }
            }
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
      }
    }
  }
}

// 和activity组件类似 逻辑复用一套
function commitSuspenseHydrationCallbacks(
  finishedRoot: FiberRoot,
  finishedWork: Fiber,
) {
  // $FlowFixMe[constant-condition]
  if (!supportsHydration) {
    return;
  }
  // state为空意味着可能现在要显示节点了 这里主要保存了是suspense的一些信息，例如等待数据ready的回调函数
  const newState: SuspenseState | null = finishedWork.memoizedState;
  if (newState === null) {
    const current = finishedWork.alternate;
    // current非空意味着已经进行过suspense组件的初始化了
    if (current !== null) {
      const prevState: SuspenseState | null = current.memoizedState;
      // 以前是等待数据ready，现在没有需要ready 的东西了
      // 那就意味着可以显示界面了
      if (prevState !== null) {
        const suspenseInstance = prevState.dehydrated;
        if (suspenseInstance !== null) {
          // dom复用后执行初始化
          commitHostHydratedSuspense(suspenseInstance, finishedWork);
          if (enableSuspenseCallback) {
            try {
              // TODO: Delete this feature. It's not properly covered by DEV features.
              const hydrationCallbacks = finishedRoot.hydrationCallbacks;
              // 一样的执行onHydrated
              if (hydrationCallbacks !== null) {
                const onHydrated = hydrationCallbacks.onHydrated;
                if (onHydrated) {
                  onHydrated(suspenseInstance);
                }
              }
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          }
        }
      }
    }
  }
}

function getRetryCache(finishedWork: Fiber) {
  // TODO: Unify the interface for the retry cache so we don't have to switch
  // on the tag like this.
  switch (finishedWork.tag) {
    case ActivityComponent:
    case SuspenseComponent:
    case SuspenseListComponent: {
      let retryCache = finishedWork.stateNode;
      if (retryCache === null) {
        retryCache = finishedWork.stateNode = new PossiblyWeakSet();
      }
      return retryCache;
    }
    case OffscreenComponent: {
      const instance: OffscreenInstance = finishedWork.stateNode;
      let retryCache: null | Set<Wakeable> | WeakSet<Wakeable> =
        instance._retryCache;
      if (retryCache === null) {
        retryCache = instance._retryCache = new PossiblyWeakSet();
      }
      return retryCache;
    }
    default: {
      throw new Error(
        `Unexpected Suspense handler tag (${finishedWork.tag}). This is a ` +
          'bug in React.',
      );
    }
  }
}

// 对use的函数绑定then事件监听器，用于等待ready后加入到更新任务队列列
function attachSuspenseRetryListeners(
  finishedWork: Fiber,
  wakeables: RetryQueue,
) {
  // If this boundary just timed out, then it will have a set of wakeables.
  // For each wakeable, attach a listener so that when it resolves, React
  // attempts to re-render the boundary in the primary (pre-timeout) state.
  const retryCache = getRetryCache(finishedWork);
  wakeables.forEach(wakeable => {
    // Memoize using the boundary fiber to prevent redundant listeners.
    // 检查use是否有绑定回调函数
    if (!retryCache.has(wakeable)) {
      retryCache.add(wakeable);

      if (enableUpdaterTracking) {
        if (isDevToolsPresent) {
          if (inProgressLanes !== null && inProgressRoot !== null) {
            // If we have pending work still, associate the original updaters with it.
            restorePendingUpdaters(inProgressRoot, inProgressLanes);
          } else {
            throw Error(
              'Expected finished root and lanes to be set. This is a bug in React.',
            );
          }
        }
      }

      const retry = resolveRetryWakeable.bind(null, finishedWork, wakeable);
      wakeable.then(retry, retry);
    }
  });
}

// This function detects when a Suspense boundary goes from visible to hidden.
// It returns false if the boundary is already hidden.
// TODO: Use an effect tag.
function isSuspenseBoundaryBeingHidden(
  current: Fiber | null,
  finishedWork: Fiber,
): boolean {
  if (current !== null) {
    const oldState: SuspenseState | null = current.memoizedState;
    if (oldState === null || oldState.dehydrated !== null) {
      const newState: SuspenseState | null = finishedWork.memoizedState;
      return newState !== null && newState.dehydrated === null;
    }
  }
  return false;
}


// 删除、插入、移动、更新 DOM。
// Offscreen节点隐藏或显示。
// 清理旧 ref。
// 执行 useLayoutEffect 的旧清理函数。
// 处理 Suspense重试监听和 Hydration。
// 挂载、释放 Hoistable资源。
// 核心为commitMutationEffectsOnFiber
// commitMutationEffects
//   ↓
// commitMutationEffectsOnFiber
//   ↓
// recursivelyTraverseMutationEffects
//   ├─ commitDeletionEffects
//   └─ commitMutationEffectsOnFiber(child)
export function commitMutationEffects(
  root: FiberRoot,
  finishedWork: Fiber,
  committedLanes: Lanes,
) {
  // 切换共享变量
  inProgressLanes = committedLanes;
  inProgressRoot = root;

  rootViewTransitionAffected = false;
  inUpdateViewTransition = false;
  // 重置性能追踪器时间
  resetComponentEffectTimers();
  // 提交effect
  // 遍历Fiber并执行真正的Mutation
  commitMutationEffectsOnFiber(finishedWork, root, committedLanes);

  inProgressLanes = null;
  inProgressRoot = null;
}

// 深度遍历递归节点
function recursivelyTraverseMutationEffects(
  root: FiberRoot,
  parentFiber: Fiber,
  lanes: Lanes,
) {
  // Deletions effects can be scheduled on any fiber type. They need to happen
  // before the children effects have fired.
  // 获取更新中要删除的fiber节点 
  const deletions = parentFiber.deletions;
  if (deletions !== null) {
    for (let i = 0; i < deletions.length; i++) {
      const childToDelete = deletions[i];
      // 执行effect回调函数，清理effect
      commitDeletionEffects(root, parentFiber, childToDelete);
    }
  }
  // 如果子节点要更新dom
  if (parentFiber.subtreeFlags & (MutationMask | Cloned)) {
    let child = parentFiber.child;
    while (child !== null) {
      // 这里可以看出来深度，因为先遍历子节点后遍历兄弟
      commitMutationEffectsOnFiber(child, root, lanes);
      child = child.sibling;
    }
  }
}

// 当前正在提交修改的fiber子树
let currentHoistableRoot: HoistableRoot | null = null;

// 根据 Fiber 类型提交 Mutation 阶段工作：递归处理子树，并更新 DOM、ref、显隐和资源。
// FunctionComponent
// → 清理旧useLayoutEffect
// ClassComponent
// → 清理旧ref、延迟隐藏回调
// HostComponent
// → 更新DOM属性、处理插入
// HostText
// → 更新文本
// HostRoot
// → 提交整棵Root、处理Hydration
// SuspenseComponent
// → 处理fallback和Promise重试监听
// OffscreenComponent
// → 隐藏或显示DOM、管理Effect
// HostHoistable
// → 管理title、meta、样式和脚本资源
function commitMutationEffectsOnFiber(
  // Render 阶段已经构建完成、等待提交的 Fiber。
  finishedWork: Fiber,
  // 当前提交所属的 FiberRoot。
  root: FiberRoot,
  // 本次提交处理的任务通道。
  lanes: Lanes,
) {
  // 性能追踪相关变量
  const prevEffectStart = pushComponentEffectStart();
  const prevEffectDuration = pushComponentEffectDuration();
  const prevEffectErrors = pushComponentEffectErrors();
  const prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();
  // 获取旧 Fiber；null 表示当前 Fiber 是首次挂载。
  const current = finishedWork.alternate;
  // 获取当前 Fiber 在本次提交中需要处理的操作标记。
  const flags = finishedWork.flags;

  // The effect flag should be checked *after* we refine the type of fiber,
  // because the fiber tag is more specific. An exception is any flag related
  // to reconciliation, because those can be set on all fiber types.
  // 看要提交修改的节点类型
  switch (finishedWork.tag) {
    // 函数组件本身没有 DOM，主要提交 Hook Effect，并递归处理其返回的子树。
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent: {
      // Mutate event effect callbacks on the way down, before mutation effects.
      // This ensures that parent event effects are mutated before child effects.
      // This isn't a supported use case, so we can re-consider it,
      // but this was the behavior we originally shipped.
      // 处理隐藏组件中effect函数中state和props的更新问题
      if (enableEffectEventMutationPhase) {
        // 如果要更新节点
        if (flags & Update) {
          // 获取更新队列和参数
          const updateQueue: FunctionComponentUpdateQueue | null =
            finishedWork.updateQueue as any;
          const eventPayloads =
            updateQueue !== null ? updateQueue.events : null;
          if (eventPayloads !== null) {
            for (let ii = 0; ii < eventPayloads.length; ii++) {
              const {ref, nextImpl} = eventPayloads[ii];
              // 核心实现 更新impl 由于useEffectEvent传的函数绑定了作用域，避免内部使用的变量
              // 没有更新，所以需要更新函数
              ref.impl = nextImpl;
            }
          }
        }
      }
      // 先处理 deletions 然后对子 Fiber进行遍历处理
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      // 插入节点
      commitReconciliationEffects(finishedWork, lanes);

      // 如果有update任务标记
      if (flags & Update) {
        // 先执行旧 useInsertionEffect 的清理函数。
        // 执行effect的销毁与清理
        commitHookEffectListUnmount(
          HookInsertion | HookHasEffect,
          finishedWork,
          finishedWork.return,
        );
        // TODO: Use a commitHookInsertionUnmountEffects wrapper to record timings.
        // 提交执行新的 useInsertionEffect 执行effect的初始化
        commitHookEffectListMount(HookInsertion | HookHasEffect, finishedWork);
        // DOM 更新后、重新执行 Layout Effect 前，先清理旧 useLayoutEffect。
        // 执行effect的清理工作
        commitHookLayoutUnmountEffects(
          finishedWork,
          finishedWork.return,
          HookLayout | HookHasEffect,
        );
      }
      break;
    }
    // Class 组件：处理子树、Placement、旧 ref 和隐藏状态下延迟的回调。
    case ClassComponent: {
      // 递归提交子树中的 DOM 变更。
      // 先处理 deletions 然后调用本函数对子 Fiber进行递归遍历处理
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      // 插入或移动fiber节点
      commitReconciliationEffects(finishedWork, lanes);

      // ref 发生变化时，先清理ref解绑旧实例；新 ref 在 Layout 阶段绑定。
      if (flags & Ref) {
        if (!offscreenSubtreeWasHidden && current !== null) {
          safelyDetachRef(current, current.return);
        }
      }

      // 隐藏的 Offscreen 子树暂时不能执行 setState 回调，将它们延后到重新显示。
      if (flags & Callback && offscreenSubtreeIsHidden) {
        const updateQueue: UpdateQueue<mixed> | null =
          finishedWork.updateQueue as any;
        if (updateQueue !== null) {
          // 保存state回调函数到shared里
          deferHiddenCallbacks(updateQueue);
        }
      }
      break;
    }
    // title、meta、link 等可提升到 head 的节点或共享资源。
    case HostHoistable: {
      // $FlowFixMe[constant-condition]
      if (supportsResources) {
        // We cast because we always set the root at the React root and so it cannot be
        // null while we are processing mutation effects
        // 获取当前 document/head 对应的资源管理根。 主要是节点提升后要插入到哪个节点
        const hoistableRoot: HoistableRoot = currentHoistableRoot as any;
        // 先处理 deletions的effct清理 然后调用本函数对子 Fiber进行递归遍历处理
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        // 插入或移动fiber节点
        commitReconciliationEffects(finishedWork, lanes);

        // ref 更新时解绑旧节点。
        if (flags & Ref) {
          if (!offscreenSubtreeWasHidden && current !== null) {
            safelyDetachRef(current, current.return);
          }
        }

        // 根据新旧资源状态决定挂载、获取、释放或更新 Hoistable。
        if (flags & Update) {
          // 获取节点状态信息
          const currentResource =
            current !== null ? current.memoizedState : null;
            // 获取新计算的状态信息
          const newResource = finishedWork.memoizedState;
          // 首次挂载。alternate为空
          if (current === null) {
            // We are mounting a new HostHoistable Fiber. We fork the mount
            // behavior based on whether this instance is a Hoistable Instance
            // or a Hoistable Resource
            // 普通 Hoistable DOM，不是共享资源。
            // 状态信息还没有计算 就是意思还没有创建节点
            if (newResource === null) {
              // stateNode 为空表示尝试复用服务端已有节点。
              if (finishedWork.stateNode === null) {
                // 创建dom节点 插入到head里 保存dom实例
                finishedWork.stateNode = hydrateHoistable(
                  hoistableRoot,
                  finishedWork.type,
                  finishedWork.memoizedProps,
                  finishedWork,
                );
              } else {
                // 已创建实例，将它挂载到 head 等目标位置。
                // 调用insertBefore插入节点
                mountHoistable(
                  hoistableRoot,
                  finishedWork.type,
                  finishedWork.stateNode,
                );
              }
            } else {
              // 共享资源通过引用计数获取实例。
              // 有节点就返回，没有节点就初始化插入后返回
              finishedWork.stateNode = acquireResource(
                hoistableRoot,
                newResource,
                finishedWork.memoizedProps,
              );
            }
          // 更新后状态信息改变，先释放旧资源，再挂载新资源。
          } else if (currentResource !== newResource) {
            // We are moving to or from Hoistable Resource, or between different Hoistable Resources
            if (currentResource === null) {
              if (current.stateNode !== null) {
                // 移除节点
                unmountHoistable(current.stateNode);
              }
            } else {
              // 计数自减
              releaseResource(currentResource);
            }
            // 如果Resource对象没了 意味着资源更新了或者模式切换了
            if (newResource === null) {
              // 插入节点
              mountHoistable(
                hoistableRoot,
                finishedWork.type,
                finishedWork.stateNode,
              );
            } else {
              // 更新资源对象
              acquireResource(
                hoistableRoot,
                newResource,
                finishedWork.memoizedProps,
              );
            }
          // 仍是同一个普通 Hoistable DOM，只更新属性。
          } else if (newResource === null && finishedWork.stateNode !== null) {
            // 更新props
            commitHostUpdate(
              finishedWork,
              finishedWork.memoizedProps,
              current.memoizedProps,
            );
          }
        }
        break;
      }
      // Fall through
    }
    // html、head、body 等宿主单例节点。
    case HostSingleton: {
      // $FlowFixMe[constant-condition]
      if (supportsSingletons) {
        // 先处理 deletions的effct清理 然后调用本函数对子 Fiber进行递归遍历处理
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        // 插入或移动fiber节点
        commitReconciliationEffects(finishedWork, lanes);
        // ref 改变时解绑旧 ref。
        if (flags & Ref) {
          if (!offscreenSubtreeWasHidden && current !== null) {
            safelyDetachRef(current, current.return);
          }
        }
        // 已挂载 Singleton 的属性发生变化时更新宿主实例。
        if (current !== null && flags & Update) {
          const newProps = finishedWork.memoizedProps;
          const oldProps = current.memoizedProps;
          // 更新状态信息 更新dom属性
          commitHostUpdate(finishedWork, newProps, oldProps);
        }
        break;
      }
      // Fall through
    }
    // div、span、button 等真实 DOM 元素。
    case HostComponent: {
      // We've hit a host component, so it's no longer a direct parent.
      const prevOffscreenDirectParentIsHidden = offscreenDirectParentIsHidden;
      offscreenDirectParentIsHidden = false;

      // 提交后代的删除、插入和更新。
      // 先处理 deletions的effct清理 然后调用本函数对子 Fiber进行递归遍历处理
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      // 恢复共享信息
      offscreenDirectParentIsHidden = prevOffscreenDirectParentIsHidden;

      // 处理当前 Fiber 的插入或移动。
      commitReconciliationEffects(finishedWork, lanes);

      // ref 更新时先解绑旧 DOM；新 ref 在 Layout 阶段绑定。
      if (flags & Ref) {
        if (!offscreenSubtreeWasHidden && current !== null) {
          safelyDetachRef(current, current.return);
        }
      }
      // $FlowFixMe[constant-condition]
      if (supportsMutation) {
        // TODO: ContentReset gets cleared by the children during the commit
        // phase. This is a refactor hazard because it means we must read
        // flags the flags after `commitReconciliationEffects` has already run;
        // the order matters. We should refactor so that ContentReset does not
        // rely on mutating the flag during commit. Like by setting a flag
        // during the render phase instead.
        // 子节点从文本切换成元素前，清空宿主节点原有文本。
        if (finishedWork.flags & ContentReset) {
          commitHostResetTextContent(finishedWork);
        }

        // props、属性或事件发生变化时更新真实 DOM。
        if (flags & Update) {
          const instance: Instance = finishedWork.stateNode;
          if (instance != null) {
            // Commit the work prepared earlier.
            // For hydration we reuse the update path but we treat the oldProps
            // as the newProps. The updatePayload will contain the real change in
            // this case.
            const newProps = finishedWork.memoizedProps;
            const oldProps =
              current !== null ? current.memoizedProps : newProps;
            // 更新props
            commitHostUpdate(finishedWork, newProps, oldProps);
          }
        }

        // 表单 Action 完成后记录需要重置 form；统一在 HostRoot 分支执行。
        if (flags & FormReset) {
          needsFormReset = true;
          if (__DEV__) {
            if (finishedWork.type !== 'form') {
              // Paranoid coding. In case we accidentally start using the
              // FormReset bit for something else.
              console.error(
                'Unexpected host component type. Expected a form. This is a ' +
                  'bug in React.',
              );
            }
          }
        }
      } else {
        // $FlowFixMe[constant-condition]
        // 是否可以替换节点实现更新
        if (supportsPersistence) {
          // Persistence 模式让 alternate 指向新的 ShadowNode，释放旧树引用。
          if (finishedWork.alternate !== null) {
            // `finishedWork.alternate.stateNode` is pointing to a stale shadow
            // node at this point, retaining it and its subtree. To reclaim
            // memory, point `alternate.stateNode` to new shadow node. This
            // prevents shadow node from staying in memory longer than it
            // needs to. The correct behaviour of this is checked by test in
            // React Native: ShadowNodeReferenceCounter-itest.js#L150
            // 同步引用，释放旧节点内存
            finishedWork.alternate.stateNode = finishedWork.stateNode;
          }
        }
      }
      break;
    }
    // 真实文本节点。
    case HostText: {
      // 文本没有普通子节点，但仍统一执行递归与 Placement。
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork, lanes);

      // 文本内容发生变化时更新 Text 节点。
      if (flags & Update) {
        // $FlowFixMe[constant-condition]
        // 是否支持直接修改dom节点
        if (supportsMutation) {
          if (finishedWork.stateNode === null) {
            throw new Error(
              'This should have a text node initialized. This error is likely ' +
                'caused by a bug in React. Please file an issue.',
            );
          }

          // 新文本保存在 finishedWork.memoizedProps。
          const newText: string = finishedWork.memoizedProps;
          // For hydration we reuse the update path but we treat the oldProps
          // as the newProps. The updatePayload will contain the real change in
          // this case.
          // 更新时读取旧 Fiber 文本；Hydration 首次提交则使用新文本占位。
          const oldText: string =
            current !== null ? current.memoizedProps : newText;
          // 提交修改文本节点的内容
          commitHostTextUpdate(finishedWork, newText, oldText);
        }
      }
      break;
    }
    // React Fiber 树根节点。
    case HostRoot: {
      // 性能追踪相关
      const prevProfilerEffectDuration = pushNestedEffectDurations();

      // 重置全局变量，标记当前无dom变更
      pushRootMutationContext();
      // $FlowFixMe[constant-condition]
      // 支持直接修改dom
      if (supportsResources) {
        // 提交前准备 head 中的 Hoistable 资源。
        // 清空tag缓存
        prepareToCommitHoistables();

        // 暂存当前提交节点，并切换到当前 React Root 对应的 document/head。
        const previousHoistableRoot = currentHoistableRoot;
        // 获取document元素
        currentHoistableRoot = getHoistableRoot(root.containerInfo);

        // 递归提交整棵 Fiber 树。
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        // 离开 Root 后恢复节点
        currentHoistableRoot = previousHoistableRoot;

        // 处理 HostRoot 自身的 Placement。
        commitReconciliationEffects(finishedWork, lanes);
      } else {
        // 相对上面的逻辑少了资源切花你的步骤
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        commitReconciliationEffects(finishedWork, lanes);
      }

      // Root 有更新时处理 Hydration 完成或 Persistence 容器替换。
      // 如果有更新任务要去处理
      if (flags & Update) {
        // $FlowFixMe[constant-condition]
        // 支持修改dom节点并且是服务端模式
        if (supportsMutation && supportsHydration) {
          // 如果节点已初始化
          if (current !== null) {
            // 获取缓存的数据状态
            const prevRootState: RootState = current.memoizedState;
            // 表示已经有ready的dom文本了
            if (prevRootState.isDehydrated) {
              // 就要初始化事件，绑定事件
              // 如果是csr的话dom在客户端生成就一起初始化绑定事件了
              commitHostHydratedContainer(root, finishedWork);
            }
          }
        }
        // $FlowFixMe[constant-condition]
        // Persistence 渲染器用新的子节点集合替换根容器内容。
        // 服务端是否支持复用节点
        if (supportsPersistence) {
          // 一整个替换更新children
          commitHostRootContainerChildren(root, finishedWork);
        }
      }

      // 所有 DOM 更新完成后再重置表单，确保最新 defaultValue 已写入。
      if (needsFormReset) {
        // A form component requested to be reset during this commit. We do this
        // after all mutations in the rest of the tree so that `defaultValue`
        // will already be updated. This way you can update `defaultValue` using
        // data sent by the server as a result of the form submission.
        //
        // Theoretically we could check finishedWork.subtreeFlags & FormReset,
        // but the FormReset bit is overloaded with other flags used by other
        // fiber types. So this extra variable lets us skip traversing the tree
        // except when a form was actually submitted.
        // 清除全局标记并查找需要 reset 的 form。
        needsFormReset = false;
        // 重置表单， form reset
        recursivelyResetForms(finishedWork);
      }

      // 将子树 Effect 耗时累加到 FiberRoot。
      // 性能追踪
      if (enableProfilerTimer && enableProfilerCommitHooks) {
        root.effectDuration += popNestedEffectDurations(
          prevProfilerEffectDuration,
        );
      }

      // 结束根级 Mutation 上下文。
      // 标记root节点发生了dom变更
      popMutationContext(false);

      // Transition 中实际提交了手动 Loading UI 时，标记默认加载指示器已处理。
      // 如果有过渡指示器，root节点发生了变更，并且有需要更新的任务
      if (
        enableDefaultTransitionIndicator &&
        rootMutationContext &&
        includesLoadingIndicatorLanes(lanes)
      ) {
        // This root had a mutation. Mark this root as having rendered a manual
        // loading state.
        // 镖旗需要移除默认过渡指示器
        markIndicatorHandled(root);
      }

      break;
    }
    // createPortal 对应的 Fiber，真实子节点位于另一个容器。
    case HostPortal: {
      // For the purposes of visibility toggling, the direct children of a
      // portal are considered "children" of the nearest hidden
      // OffscreenComponent, regardless of whether there are any host components
      // in between them. This is because portals are not part of the regular
      // host tree hierarchy; we can't assume that just because a portal's
      // HostComponent parent in the React tree will also be a parent in the
      // actual host tree. So we must hide all of them.
      // Portal 直接子节点的显隐由最近 Offscreen 状态决定。
      // 获取隐藏状态信息
      const prevOffscreenDirectParentIsHidden = offscreenDirectParentIsHidden;
      offscreenDirectParentIsHidden = offscreenSubtreeIsHidden;
      // 为 Portal 创建独立 Mutation 上下文。 重置上下文为false
      const prevMutationContext = pushMutationContext();
      // $FlowFixMe[constant-condition]
      if (supportsResources) {
        // Portal 可能属于另一个 document，因此切换资源根。
        // 切换工作document
        const previousHoistableRoot = currentHoistableRoot;
        // 获取document
        currentHoistableRoot = getHoistableRoot(
          finishedWork.stateNode.containerInfo,
        );
        // 递归提交更新和初始effect
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        commitReconciliationEffects(finishedWork, lanes);
        currentHoistableRoot = previousHoistableRoot;
      } else {
        // 递归提交更新和初始effect
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        commitReconciliationEffects(finishedWork, lanes);
      }
      // Portal 内发生变更时，无法准确归属父 ViewTransition，因此让根参与动画。
      if (viewTransitionMutationContext && inUpdateViewTransition) {
        // A Portal doesn't necessarily exist within the context of this subtree.
        // Ideally we would track which React ViewTransition component nests the container
        // but that's costly. Instead, we treat each Portal as if it's a new React root.
        // Therefore any leaked mutation means that the root should animate.
        // 镖旗根节点需要进行过渡变更、
        rootViewTransitionAffected = true;
      }
      // 恢复外层 Mutation 和 Offscreen 上下文。
      popMutationContext(prevMutationContext);
      offscreenDirectParentIsHidden = prevOffscreenDirectParentIsHidden;

      // Persistence 模式用 pendingChildren 替换 Portal 容器内容。
      // 是否有更新任务
      if (flags & Update) {
        // $FlowFixMe[constant-condition]
        // 支持复用节点 直接更新children
        if (supportsPersistence) {
          commitHostPortalContainerChildren(
            // portal节点
            finishedWork.stateNode,
            finishedWork,
            finishedWork.stateNode.pendingChildren,
          );
        }
      }
      break;
    }
    // Profiler Fiber：提交子树并累计 Mutation Effect 耗时。
    // 性能追踪组件
    case Profiler: {
      const prevProfilerEffectDuration = pushNestedEffectDurations();

      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork, lanes);

      if (enableProfilerTimer && enableProfilerCommitHooks) {
        const profilerInstance = finishedWork.stateNode;
        // Propagate layout effect durations to the next nearest Profiler ancestor.
        // Do not reset these values until the next render so DevTools has a chance to read them first.
        profilerInstance.effectDuration += bubbleNestedEffectDurations(
          prevProfilerEffectDuration,
        );
      }
      break;
    }
    // Activity 边界：提交子树，并给挂起任务绑定资源就绪后的重试监听。
    // Activity组件，处理子节点显示影藏的，主要可以保持子节点的状态
    case ActivityComponent: {
      // 递归更新
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork, lanes);
      // 处理更新任务
      if (flags & Update) {
        // retryQueue 保存导致 Activity 挂起的 Promise/资源。
        // retryqueue就是use传入的promise的队列
        const retryQueue: RetryQueue | null = finishedWork.updateQueue as any;
        if (retryQueue !== null) {
          finishedWork.updateQueue = null;
          // 为所有use的promise函数添加监听器，负责ready后的更新任务提交
          attachSuspenseRetryListeners(finishedWork, retryQueue);
        }
      }
      break;
    }
    // Suspense组件
    case SuspenseComponent: {
      // 递归更新
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork, lanes);

      // TODO: We should mark a flag on the Suspense fiber itself, rather than
      // relying on the Offscreen fiber having a flag also being marked. The
      // reason is that this offscreen fiber might not be part of the work-in-
      // progress tree! It could have been reused from a previous render. This
      // doesn't lead to incorrect behavior because we don't rely on the flag
      // check alone; we also compare the states explicitly below. But for
      // modeling purposes, we _should_ be able to rely on the flag check alone.
      // So this is a bit fragile.
      //
      // Also, all this logic could/should move to the passive phase so it
      // doesn't block paint.
      // 获取子节点 
      const offscreenFiber: Fiber = finishedWork.child as any;
      // 如果需要切换显示的话
      if (offscreenFiber.flags & Visibility) {
        // Throttle the appearance and disappearance of Suspense fallbacks.
        // memoizedState 非空表示当前正在显示 fallback。
        const isShowingFallback =
          (finishedWork.memoizedState as SuspenseState | null) !== null;
        // 对比旧状态判断 fallback 是出现还是消失。
        const wasShowingFallback =
          current !== null &&
          (current.memoizedState as SuspenseState | null) !== null;
        // 是否节流重试
        if (alwaysThrottleRetries) {
          // 如果数据更新了的话
          if (isShowingFallback !== wasShowingFallback) {
            // A fallback is either appearing or disappearing.
            // 记录 fallback 切换时间，用于控制 Suspense 重试节流。
            // 重置时间
            markCommitTimeOfFallback();
          }
        } else {
          if (isShowingFallback && !wasShowingFallback) {
            // Old behavior. Only mark when a fallback appears, not when
            // it disappears.
            markCommitTimeOfFallback();
          }
        }
      }

      // 执行 suspenseCallback，并给未完成资源绑定重试监听。
      if (flags & Update) {
        try {
          // 提交保存更新任务到回调里
          commitSuspenseCallback(finishedWork);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
        const retryQueue: RetryQueue | null = finishedWork.updateQueue as any;
        if (retryQueue !== null) {
          finishedWork.updateQueue = null;
          // 处理异步ready渲染的回调函数
          attachSuspenseRetryListeners(finishedWork, retryQueue);
        }
      }
      break;
    }
    // Activity/Suspense 主内容使用的 Offscreen 边界，负责子树显隐。
    // 见 https://react.dev/blog/2022/06/15/react-labs-what-we-have-been-working-on-june-2022#offscreen
    // 对于一个隐藏的组件，其子节点的更新并不会及时更新上去，总是先保存着待节点显示后才更新上去
    // 所以需要记录要执行的任务和相关状态信息
    // 那同时意味着有这些信息，那么节点肯定就是隐藏状态，不然直接更新上去不就好了
    case OffscreenComponent: {
      // 获取新的state信息 对于该组件主要保存的是隐藏对象的任务和缓存
      // 目的是暂存没执行完的任务和相关数据
      // 换句话说，只有节点隐藏才需要保存一些没执行完的任务和相关状态
      // 所以state为非空时意味着节点隐藏，有一些任务还没执行更新上去
      const newState: OffscreenState | null = finishedWork.memoizedState;
      // state非空意味着是隐藏组件
      const isHidden = newState !== null;
      // 旧 Fiber memoizedState 非空表示更新前隐藏。
      // 首次挂载时current为空 memoizedState非空意味着组件是隐藏状态
      const wasHidden = current !== null && current.memoizedState !== null;

      // Concurrent 模式维护嵌套 Offscreen 状态，防止重复清理或错误显示后代。
      // 非legacy模式或者更新节点是并发模式
      if (disableLegacyMode || finishedWork.mode & ConcurrentMode) {
        // Before committing the children, track on the stack whether this
        // offscreen subtree was already hidden, so that we don't unmount the
        // effects again.
        // 保存进入当前 Offscreen 前的三种隐藏上下文。
        // 这三个状态实际上父节点执行的时候保存的，这是个深度遍历 就在下面几行代码赋值的
        const prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden;
        const prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
        const prevOffscreenDirectParentIsHidden = offscreenDirectParentIsHidden;
        // 所以上一组状态是父级节点的状态，既然父级隐藏，那么子节点肯定也要隐藏
        // 当前或祖先隐藏，都表示整棵子树本次应视为隐藏。 
        // 更新父节点的显示状态
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden || isHidden;
        offscreenDirectParentIsHidden =
          prevOffscreenDirectParentIsHidden || isHidden;
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden || wasHidden;
        // 深度递归遍历节点
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        // 子树提交完成后恢复外层上下文。
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        offscreenDirectParentIsHidden = prevOffscreenDirectParentIsHidden;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;

        // 日志跟踪
        if (
          // If this was the root of the reappear.
          wasHidden &&
          !isHidden &&
          !prevOffscreenSubtreeIsHidden &&
          !prevOffscreenSubtreeWasHidden &&
          enableProfilerTimer &&
          enableProfilerCommitHooks &&
          enableComponentPerformanceTrack &&
          (finishedWork.mode & ProfileMode) !== NoMode &&
          componentEffectStartTime >= 0 &&
          componentEffectEndTime >= 0 &&
          componentEffectEndTime - componentEffectStartTime > 0.05
        ) {
          logComponentReappeared(
            finishedWork,
            componentEffectStartTime,
            componentEffectEndTime,
          );
        }
      } else {
        // 直接遍历子节点
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      }

      // 处理 Offscreen 自身的 Placement。
      // 提交节点插入初始化
      commitReconciliationEffects(finishedWork, lanes);

      // Visibility 表示显示/隐藏状态发生变化。
      if (flags & Visibility) {
        // 获取控制 Offscreen DOM 和事件状态的实例。
        const offscreenInstance: OffscreenInstance = finishedWork.stateNode;

        // Track the current state on the Offscreen instance so we can
        // read it during an event
        // 更新实例中的可见状态位。
        if (isHidden) {
          // &= ~：清除 OffscreenVisible 位。 标记节点隐藏
          offscreenInstance._visibility &= ~OffscreenVisible;
        } else {
          // |=：设置 OffscreenVisible 位。 标记节点显示
          offscreenInstance._visibility |= OffscreenVisible;
        }

        // current 非空表示显隐变化发生在更新而不是首次挂载。
        const isUpdate = current !== null;
        if (isHidden) {
          // Only trigger disappear layout effects if:
          //   - This is an update, not first mount.
          //   - This Offscreen was not hidden before.
          //   - Ancestor Offscreen was not hidden in previous commit or in this commit
          // 如果组件需要更新，之前不是隐藏状态 父级一直显示
          if (
            isUpdate &&
            !wasHidden &&
            !offscreenSubtreeIsHidden &&
            !offscreenSubtreeWasHidden
          ) {
            // 如果非legacy并且是并发模式
            if (
              disableLegacyMode ||
              (finishedWork.mode & ConcurrentMode) !== NoMode
            ) {
              // Disappear the layout effects of all the children
              // 子树由显示变为隐藏，清理 ref 和 Layout Effect。
              // 执行effect的清理和资源卸载清理
              recursivelyTraverseDisappearLayoutEffects(finishedWork);
              // 性能追踪
              if (
                enableProfilerTimer &&
                enableProfilerCommitHooks &&
                enableComponentPerformanceTrack &&
                (finishedWork.mode & ProfileMode) !== NoMode &&
                componentEffectStartTime >= 0 &&
                componentEffectEndTime >= 0 &&
                componentEffectEndTime - componentEffectStartTime > 0.05
              ) {
                logComponentDisappeared(
                  finishedWork,
                  componentEffectStartTime,
                  componentEffectEndTime,
                );
              }
            }
          }
        }

        // $FlowFixMe[constant-condition]
        // 支持修改dom节点
        if (supportsMutation) {
          // If it's trying to unhide but the parent is still hidden, then we should not unhide.
          // 隐藏时总要处理；显示时只有直接父 Offscreen 可见才真正显示 DOM。
          if (isHidden || !offscreenDirectParentIsHidden) {
            // 切换节点显示状态 设置display属性
            hideOrUnhideAllChildren(finishedWork, isHidden);
          }
        }
      }

      // TODO: Move to passive phase
      // 给 Offscreen 内挂起的资源绑定重试监听。
      // 处理异步函数的ready就绪更新
      if (flags & Update) {
        const offscreenQueue: OffscreenQueue | null =
          finishedWork.updateQueue as any;
        if (offscreenQueue !== null) {
          const retryQueue = offscreenQueue.retryQueue;
          if (retryQueue !== null) {
            offscreenQueue.retryQueue = null;
            // 执行异步资源的监听回调
            attachSuspenseRetryListeners(finishedWork, retryQueue);
          }
        }
      }
      break;
    }
    // SuspenseList：提交子树，并监听列表中未完成的 Suspense 资源。
    case SuspenseListComponent: {
      // 递归更新
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork, lanes);
      // 有更新的话就得绑定then函数处理ready后的更新
      if (flags & Update) {
        const retryQueue: Set<Wakeable> | null =
          finishedWork.updateQueue as any;
        if (retryQueue !== null) {
          finishedWork.updateQueue = null;
          attachSuspenseRetryListeners(finishedWork, retryQueue);
        }
      }
      break;
    }
    // ViewTransation组件
    case ViewTransitionComponent: {
      if (enableViewTransition) {
        // ref 更新时解绑旧 ViewTransition 实例。
        if (flags & Ref) {
          // 解绑ref
          if (!offscreenSubtreeWasHidden && current !== null) {
            safelyDetachRef(current, current.return);
          }
        }
        // 创建当前 ViewTransition 独立的 DOM 变更记录范围。
        // 保存以前的状态 便于恢复
        const prevMutationContext = pushMutationContext();
        const prevUpdate = inUpdateViewTransition;
        // 只有 ViewTransition 支持的 Lane 才参与本次动画。
        const isViewTransitionEligible =
          // $FlowFixMe[constant-condition]
          enableViewTransition &&
          // 只有一些异步任务才支持
          includesOnlyViewTransitionEligibleLanes(lanes);
        // 获取新的props
        const props = finishedWork.memoizedProps;
        // update 不为 none 时，记录子树变更是否需要触发更新动画。
        inUpdateViewTransition =
          isViewTransitionEligible &&
          // 有过渡样式
          getViewTransitionClassName(props.default, props.update) !== 'none';
        // 递归更新
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        commitReconciliationEffects(finishedWork, lanes);
        // 标记需要更新
        if (isViewTransitionEligible) {
          if (current === null) {
            // This is a new mount. We should have handled this as part of the
            // Placement effect or it is deeper inside a entering transition.
          } else if (viewTransitionMutationContext) {
            // Something mutated in this tree so we need to animate this regardless
            // what the measurements say. We use the Update flag to track this.
            // If diffing was done in the render phase, like we used, this could have
            // been done in the render already.
            // 子树确实修改了 DOM，设置 Update 位，后续测量并播放更新动画。
            finishedWork.flags |= Update;
          }
        }
        // 离开边界，恢复外层 ViewTransition 和 Mutation 上下文。
        // 恢复上下文
        inUpdateViewTransition = prevUpdate;
        popMutationContext(prevMutationContext);
        break;
      }
      break;
    }
    // Scope组件，目前没有足够的文档
    case ScopeComponent: {
      if (enableScopeAPI) {
        // 递归更新
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        commitReconciliationEffects(finishedWork, lanes);

        // TODO: This is a temporary solution that allowed us to transition away
        // from React Flare on www.
        // Scope ref 更新时先解绑旧 ref，再在可见状态下绑定新 ref。
        // 需要更新ref
        if (flags & Ref) {
          // 解绑ref
          if (!offscreenSubtreeWasHidden && current !== null) {
            safelyDetachRef(finishedWork, finishedWork.return);
          }
          // 绑定ref
          if (!offscreenSubtreeIsHidden) {
            safelyAttachRef(finishedWork, finishedWork.return);
          }
        }
        // 需要更新
        if (flags & Update) {
          const scopeInstance = finishedWork.stateNode;
          // 保存节点引用
          prepareScopeUpdate(scopeInstance, finishedWork);
        }
      }
      break;
    }
    // Fragment 开启 ref 功能时，让复用的 Fragment 实例指向新 Fiber。
    case Fragment:
      // 如有支持fragmnet ref
      if (enableFragmentRefs) {
        if (current && current.stateNode !== null) {
          // 在stateNode上保存fragment引用
          updateFragmentInstanceFiber(finishedWork, current.stateNode);
        }
      }
    // Fallthrough
    // 其他没有专用 Mutation 逻辑的 Fiber，只需递归子树并处理 Placement。
    default: {
      // 直接进如常规的递归更新
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork, lanes);

      break;
    }
  }

  // 性能追踪相关、
  if (
    enableProfilerTimer &&
    enableProfilerCommitHooks &&
    enableComponentPerformanceTrack &&
    (finishedWork.mode & ProfileMode) !== NoMode &&
    componentEffectStartTime >= 0 &&
    componentEffectEndTime >= 0
  ) {
    if (componentEffectSpawnedUpdate || componentEffectDuration > 0.05) {
      logComponentEffect(
        finishedWork,
        componentEffectStartTime,
        componentEffectEndTime,
        componentEffectDuration,
        componentEffectErrors,
      );
    }
    if (
      // Insertion
      finishedWork.alternate === null &&
      finishedWork.return !== null &&
      finishedWork.return.alternate !== null &&
      componentEffectEndTime - componentEffectStartTime > 0.05
    ) {
      const isHydration = isHydratingParent(
        finishedWork.return.alternate,
        finishedWork.return,
      );
      if (!isHydration) {
        logComponentMount(
          finishedWork,
          componentEffectStartTime,
          componentEffectEndTime,
        );
      }
    }
  }

  // 当前 Fiber 处理完成，恢复进入前的性能统计上下文。
  popComponentEffectStart(prevEffectStart);
  popComponentEffectDuration(prevEffectDuration);
  popComponentEffectErrors(prevEffectErrors);
  popComponentEffectDidSpawnUpdate(prevEffectDidSpawnUpdate);
}

// 主要进行节点插入和事件绑定（fragment）
function commitReconciliationEffects(
  finishedWork: Fiber,
  committedLanes: Lanes,
) {
  // Placement effects (insertions, reorders) can be scheduled on any fiber
  // type. They needs to happen after the children effects have fired, but
  // before the effects on this fiber have fired.
  const flags = finishedWork.flags;
  // 提交插入任务
  if (flags & Placement) {
    commitHostPlacement(finishedWork);
    // Clear the "placement" from effect tag so that we know that this is
    // inserted, before any life-cycles like componentDidMount gets called.
    // TODO: findDOMNode doesn't rely on this any more but isMounted does
    // and isMounted is deprecated anyway so we should be able to kill this.
    finishedWork.flags &= ~Placement;
  }
  // 服务端渲染复用标记处理
  if (flags & Hydrating) {
    finishedWork.flags &= ~Hydrating;
  }
}

// 递归重置form
function recursivelyResetForms(parentFiber: Fiber) {
  if (parentFiber.subtreeFlags & FormReset) {
    let child = parentFiber.child;
    while (child !== null) {
      resetFormOnFiber(child);
      child = child.sibling;
    }
  }
}

function resetFormOnFiber(fiber: Fiber) {
  // 先重置本身节点
  recursivelyResetForms(fiber);
  // 如果是真实dom组件并且需要重置form
  if (fiber.tag === HostComponent && fiber.flags & FormReset) {
    // 获取form节点
    const formInstance: FormInstance = fiber.stateNode;
    // form reset
    resetFormInstance(formInstance);
  }
}

export function commitAfterMutationEffects(
  root: FiberRoot,
  finishedWork: Fiber,
  committedLanes: Lanes,
): void {
  if (!enableViewTransition) {
    // This phase is only used for view transitions.
    return;
  }
  commitAfterMutationEffectsOnFiber(finishedWork, root, committedLanes);
}

function recursivelyTraverseAfterMutationEffects(
  root: FiberRoot,
  parentFiber: Fiber,
  lanes: Lanes,
) {
  // We need to visit the same nodes that we visited in the before mutation phase.
  if (parentFiber.subtreeFlags & BeforeAndAfterMutationTransitionMask) {
    let child = parentFiber.child;
    while (child !== null) {
      commitAfterMutationEffectsOnFiber(child, root, lanes);
      child = child.sibling;
    }
  } else {
    // Nothing has changed in this subtree, but the parent may have still affected
    // its size and position. We need to measure this and if not, restore it to
    // not animate.
    measureNestedViewTransitions(parentFiber, false);
  }
}

function commitAfterMutationEffectsOnFiber(
  finishedWork: Fiber,
  root: FiberRoot,
  lanes: Lanes,
) {
  const current = finishedWork.alternate;
  if (current === null) {
    // This is a newly inserted subtree. We can't use Placement flags to detect
    // this since they get removed in the mutation phase. Usually it's not enough
    // to just check current because that can also happen deeper in the same tree.
    // However, since we don't need to visit newly inserted subtrees in AfterMutation
    // we can just bail after we're done with the first one.
    // The first ViewTransition inside a newly mounted tree runs an enter transition
    // but other nested ones don't unless they have a named pair.
    commitEnterViewTransitions(finishedWork, false);
    return;
  }

  switch (finishedWork.tag) {
    case HostRoot: {
      viewTransitionContextChanged = false;
      rootViewTransitionNameCanceled = false;
      pushViewTransitionCancelableScope();
      recursivelyTraverseAfterMutationEffects(root, finishedWork, lanes);
      if (!viewTransitionContextChanged && !rootViewTransitionAffected) {
        // If we didn't leak any resizing out to the root, we don't have to transition
        // the root itself. This means that we can now safely cancel any cancellations
        // that bubbled all the way up.
        const cancelableChildren = viewTransitionCancelableChildren;
        if (cancelableChildren !== null) {
          for (let i = 0; i < cancelableChildren.length; i += 3) {
            cancelViewTransitionName(
              cancelableChildren[i] as any as Instance,
              cancelableChildren[i + 1] as any as string,
              cancelableChildren[i + 2] as any as Props,
            );
          }
        }
        // We also cancel the root itself.
        cancelRootViewTransitionName(root.containerInfo);
        rootViewTransitionNameCanceled = true;
      }
      popViewTransitionCancelableScope(null);
      break;
    }
    case HostComponent: {
      recursivelyTraverseAfterMutationEffects(root, finishedWork, lanes);
      break;
    }
    case HostPortal: {
      const prevContextChanged = viewTransitionContextChanged;
      viewTransitionContextChanged = false;
      recursivelyTraverseAfterMutationEffects(root, finishedWork, lanes);
      if (viewTransitionContextChanged) {
        // A Portal doesn't necessarily exist within the context of this subtree.
        // Ideally we would track which React ViewTransition component nests the container
        // but that's costly. Instead, we treat each Portal as if it's a new React root.
        // Therefore any leaked resize of a child could affect the root so the root should animate.
        // We only do this if the Portal is inside a ViewTransition and it is not disabled
        // with update="none". Otherwise the Portal is considered not animating.
        rootViewTransitionAffected = true;
      }
      viewTransitionContextChanged = prevContextChanged;
      break;
    }
    case OffscreenComponent: {
      const isModernRoot =
        disableLegacyMode || (finishedWork.mode & ConcurrentMode) !== NoMode;
      if (isModernRoot) {
        const isHidden = finishedWork.memoizedState !== null;
        if (isHidden) {
          // The Offscreen tree is hidden. Skip over its after mutation effects.
        } else {
          // The Offscreen tree is visible.
          const wasHidden = current.memoizedState !== null;
          if (wasHidden) {
            commitEnterViewTransitions(finishedWork, false);
            // If it was previous hidden then the children are treated as enter
            // not updates so we don't need to visit these children.
          } else {
            recursivelyTraverseAfterMutationEffects(root, finishedWork, lanes);
          }
        }
      } else {
        recursivelyTraverseAfterMutationEffects(root, finishedWork, lanes);
      }
      break;
    }
    case ViewTransitionComponent: {
      const prevContextChanged = viewTransitionContextChanged;
      const prevCancelableChildren = pushViewTransitionCancelableScope();
      viewTransitionContextChanged = false;
      recursivelyTraverseAfterMutationEffects(root, finishedWork, lanes);

      if (viewTransitionContextChanged) {
        finishedWork.flags |= Update;
      }

      const inViewport = measureUpdateViewTransition(
        current,
        finishedWork,
        false,
      );

      if ((finishedWork.flags & Update) === NoFlags || !inViewport) {
        // If this boundary didn't update, then we may be able to cancel its children.
        // We bubble them up to the parent set to be determined later if we can cancel.
        // Similarly, if old and new state was outside the viewport, we can skip it
        // even if it did update.
        if (prevCancelableChildren === null) {
          // Bubbling up this whole set to the parent.
        } else {
          // Merge with parent set.
          // $FlowFixMe[method-unbinding]
          prevCancelableChildren.push.apply(
            prevCancelableChildren,
            viewTransitionCancelableChildren,
          );
          popViewTransitionCancelableScope(prevCancelableChildren);
        }
        // TODO: If this doesn't end up canceled, because a parent animates,
        // then we should probably issue an event since this instance is part of it.
      } else {
        const props: ViewTransitionProps = finishedWork.memoizedProps;
        scheduleViewTransitionEvent(finishedWork, props.onUpdate);

        // If this boundary did update, we cannot cancel its children so those are dropped.
        popViewTransitionCancelableScope(prevCancelableChildren);
      }

      if ((finishedWork.flags & AffectedParentLayout) !== NoFlags) {
        // This boundary changed size in a way that may have caused its parent to
        // relayout. We need to bubble this information up to the parent.
        viewTransitionContextChanged = true;
      } else {
        // Otherwise, we restore it to whatever the parent had found so far.
        viewTransitionContextChanged = prevContextChanged;
      }
      break;
    }
    default: {
      recursivelyTraverseAfterMutationEffects(root, finishedWork, lanes);
      break;
    }
  }
}

// layout阶段执行的内容
export function commitLayoutEffects(
  finishedWork: Fiber,
  root: FiberRoot,
  committedLanes: Lanes,
): void {
  // 切换执行上下文
  inProgressLanes = committedLanes;
  inProgressRoot = root;
  // effect计时器
  resetComponentEffectTimers();
  // 获取双缓存节点
  const current = finishedWork.alternate;
  // 执行layout阶段的effect
  commitLayoutEffectOnFiber(root, current, finishedWork, committedLanes);
  // 清空上下文
  inProgressLanes = null;
  inProgressRoot = null;
}


// 调用commitLayoutEffectOnFiber深度遍历子节点
function recursivelyTraverseLayoutEffects(
  root: FiberRoot,
  parentFiber: Fiber,
  lanes: Lanes,
) {
  if (parentFiber.subtreeFlags & LayoutMask) {
    let child = parentFiber.child;
    while (child !== null) {
      const current = child.alternate;
      commitLayoutEffectOnFiber(root, current, child, lanes);
      child = child.sibling;
    }
  }
}

// 执行组件卸载的一些effect的销毁和资源释放操作
export function disappearLayoutEffects(finishedWork: Fiber) {
  // 时间记录相关
  const prevEffectStart = pushComponentEffectStart();
  const prevEffectDuration = pushComponentEffectDuration();
  const prevEffectErrors = pushComponentEffectErrors();
  const prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();
  // 判断组件的类型
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent: {
      // 虚拟组件提交卸载的effect 
      // 执行effect的清理
      // TODO (Offscreen) Check: flags & LayoutStatic
      commitHookLayoutUnmountEffects(
        finishedWork,
        finishedWork.return,
        HookLayout,
      );
      // 继续递归
      recursivelyTraverseDisappearLayoutEffects(finishedWork);
      break;
    }
    case ClassComponent: {
      // TODO (Offscreen) Check: flags & RefStatic
      // 解绑ref
      safelyDetachRef(finishedWork, finishedWork.return);

      const instance = finishedWork.stateNode;
      if (typeof instance.componentWillUnmount === 'function') {
        // 执行componentWillUnmount
        safelyCallComponentWillUnmount(
          finishedWork,
          finishedWork.return,
          instance,
        );
      }
      // 继续深度遍历
      recursivelyTraverseDisappearLayoutEffects(finishedWork);
      break;
    }
    case HostSingleton: {
      // $FlowFixMe[constant-condition]
      if (supportsSingletons) {
        // TODO (Offscreen) Check: flags & RefStatic
        // 释放对象清理属性
        commitHostSingletonRelease(finishedWork);
      }
      // Expected fallthrough to HostComponent
    }
    case HostHoistable:
    case HostComponent: {
      // TODO (Offscreen) Check: flags & RefStatic
      // 解绑ref
      safelyDetachRef(finishedWork, finishedWork.return);

      if (
        enableFragmentRefs &&
        (finishedWork.tag === HostComponent ||
          (enableFragmentRefsTextNodes && finishedWork.tag === HostText))
      ) {
        commitFragmentInstanceDeletionEffects(finishedWork);
      }

      recursivelyTraverseDisappearLayoutEffects(finishedWork);
      break;
    }
    case OffscreenComponent: {
      const isHidden = finishedWork.memoizedState !== null;
      if (isHidden) {
        // Nested Offscreen tree is already hidden. Don't disappear
        // its effects.
      } else {
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
      }
      break;
    }
    case ViewTransitionComponent: {
      if (enableViewTransition) {
        if (__DEV__) {
          if (finishedWork.flags & ViewTransitionNamedStatic) {
            untrackNamedViewTransition(finishedWork);
          }
        }
        safelyDetachRef(finishedWork, finishedWork.return);
      }
      recursivelyTraverseDisappearLayoutEffects(finishedWork);
      break;
    }
    case Fragment: {
      if (enableFragmentRefs) {
        safelyDetachRef(finishedWork, finishedWork.return);
      }
      // Fallthrough
    }
    default: {
      recursivelyTraverseDisappearLayoutEffects(finishedWork);
      break;
    }
  }

  if (
    enableProfilerTimer &&
    enableProfilerCommitHooks &&
    enableComponentPerformanceTrack &&
    (finishedWork.mode & ProfileMode) !== NoMode &&
    componentEffectStartTime >= 0 &&
    componentEffectEndTime >= 0 &&
    (componentEffectSpawnedUpdate || componentEffectDuration > 0.05)
  ) {
    logComponentEffect(
      finishedWork,
      componentEffectStartTime,
      componentEffectEndTime,
      componentEffectDuration,
      componentEffectErrors,
    );
  }

  popComponentEffectStart(prevEffectStart);
  popComponentEffectDuration(prevEffectDuration);
  popComponentEffectErrors(prevEffectErrors);
  popComponentEffectDidSpawnUpdate(prevEffectDidSpawnUpdate);
}

// 深度递归提交useLayoutEffect
function recursivelyTraverseDisappearLayoutEffects(parentFiber: Fiber) {
  // TODO (Offscreen) Check: subtreeflags & (RefStatic | LayoutStatic)
  let child = parentFiber.child;
  while (child !== null) {
    // 组件卸载相关的effect清理和资源卸载
    disappearLayoutEffects(child);
    child = child.sibling;
  }
}

// Offscreen子树从隐藏变成显示时，恢复之前因为隐藏而停掉的布局相关功能。
export function reappearLayoutEffects(
  finishedRoot: FiberRoot,
  current: Fiber | null,
  finishedWork: Fiber,
  // This function visits both newly finished work and nodes that were re-used
  // from a previously committed tree. We cannot check non-static flags if the
  // node was reused.
  includeWorkInProgressEffects: boolean,
) {
  const prevEffectStart = pushComponentEffectStart();
  const prevEffectDuration = pushComponentEffectDuration();
  const prevEffectErrors = pushComponentEffectErrors();
  const prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();
  // Turn on layout effects in a tree that previously disappeared.
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      recursivelyTraverseReappearLayoutEffects(
        finishedRoot,
        finishedWork,
        includeWorkInProgressEffects,
      );
      // TODO: Check flags & LayoutStatic
      commitHookLayoutEffects(finishedWork, HookLayout);
      break;
    }
    case ClassComponent: {
      recursivelyTraverseReappearLayoutEffects(
        finishedRoot,
        finishedWork,
        includeWorkInProgressEffects,
      );

      commitClassDidMount(finishedWork);

      commitClassHiddenCallbacks(finishedWork);

      // If this is newly finished work, check for setState callbacks
      if (includeWorkInProgressEffects && flags & Callback) {
        commitClassCallbacks(finishedWork);
      }

      // TODO: Check flags & RefStatic
      safelyAttachRef(finishedWork, finishedWork.return);
      break;
    }
    // Unlike commitLayoutEffectsOnFiber, we don't need to handle HostRoot
    // because this function only visits nodes that are inside an
    // Offscreen fiber.
    // case HostRoot: {
    //  ...
    // }
    case HostSingleton: {
      // $FlowFixMe[constant-condition]
      if (supportsSingletons) {
        // We acquire the singleton instance first so it has appropriate
        // styles before other layout effects run. This isn't perfect because
        // an early sibling of the singleton may have an effect that can
        // observe the singleton before it is acquired.
        // @TODO move this to the mutation phase. The reason it isn't there yet
        // is it seemingly requires an extra traversal because we need to move the
        // disappear effect into a phase before the appear phase
        commitHostSingletonAcquisition(finishedWork);
        // We fall through to the HostComponent case below.
      }
      // Fallthrough
    }
    case HostHoistable:
    case HostComponent: {
      // TODO: Enable HostText for RN
      if (enableFragmentRefs && finishedWork.tag === HostComponent) {
        commitFragmentInstanceInsertionEffects(finishedWork);
      }
      recursivelyTraverseReappearLayoutEffects(
        finishedRoot,
        finishedWork,
        includeWorkInProgressEffects,
      );

      // Renderers may schedule work to be done after host components are mounted
      // (eg DOM renderer may schedule auto-focus for inputs and form controls).
      // These effects should only be committed when components are first mounted,
      // aka when there is no current/alternate.
      if (includeWorkInProgressEffects && current === null && flags & Update) {
        commitHostMount(finishedWork);
      }

      // TODO: Check flags & Ref
      safelyAttachRef(finishedWork, finishedWork.return);
      break;
    }
    case Profiler: {
      // TODO: Figure out how Profiler updates should work with Offscreen
      if (includeWorkInProgressEffects && flags & Update) {
        const prevProfilerEffectDuration = pushNestedEffectDurations();

        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects,
        );

        const profilerInstance = finishedWork.stateNode;

        if (enableProfilerTimer && enableProfilerCommitHooks) {
          // Propagate layout effect durations to the next nearest Profiler ancestor.
          // Do not reset these values until the next render so DevTools has a chance to read them first.
          profilerInstance.effectDuration += bubbleNestedEffectDurations(
            prevProfilerEffectDuration,
          );
        }

        commitProfilerUpdate(
          finishedWork,
          current,
          commitStartTime,
          profilerInstance.effectDuration,
        );
      } else {
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects,
        );
      }
      break;
    }
    case ActivityComponent: {
      recursivelyTraverseReappearLayoutEffects(
        finishedRoot,
        finishedWork,
        includeWorkInProgressEffects,
      );

      if (includeWorkInProgressEffects && flags & Update) {
        // TODO: Delete this feature.
        commitActivityHydrationCallbacks(finishedRoot, finishedWork);
      }
      break;
    }
    case SuspenseComponent: {
      recursivelyTraverseReappearLayoutEffects(
        finishedRoot,
        finishedWork,
        includeWorkInProgressEffects,
      );

      if (includeWorkInProgressEffects && flags & Update) {
        // TODO: Delete this feature.
        commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
      }
      break;
    }
    case OffscreenComponent: {
      const offscreenState: OffscreenState = finishedWork.memoizedState;
      // $FlowFixMe[invalid-compare]
      const isHidden = offscreenState !== null;
      if (isHidden) {
        // Nested Offscreen tree is still hidden. Don't re-appear its effects.
      } else {
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects,
        );
      }
      // TODO: Check flags & Ref
      safelyAttachRef(finishedWork, finishedWork.return);
      break;
    }
    case ViewTransitionComponent: {
      if (enableViewTransition) {
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects,
        );
        if (__DEV__) {
          if (flags & ViewTransitionNamedStatic) {
            trackNamedViewTransition(finishedWork);
          }
        }
        safelyAttachRef(finishedWork, finishedWork.return);
        break;
      }
      break;
    }
    case Fragment: {
      if (enableFragmentRefs) {
        safelyAttachRef(finishedWork, finishedWork.return);
      }
      // Fallthrough
    }
    default: {
      recursivelyTraverseReappearLayoutEffects(
        finishedRoot,
        finishedWork,
        includeWorkInProgressEffects,
      );
      break;
    }
  }

  if (
    enableProfilerTimer &&
    enableProfilerCommitHooks &&
    enableComponentPerformanceTrack &&
    (finishedWork.mode & ProfileMode) !== NoMode &&
    componentEffectStartTime >= 0 &&
    componentEffectEndTime >= 0 &&
    (componentEffectSpawnedUpdate || componentEffectDuration > 0.05)
  ) {
    logComponentEffect(
      finishedWork,
      componentEffectStartTime,
      componentEffectEndTime,
      componentEffectDuration,
      componentEffectErrors,
    );
  }

  popComponentEffectStart(prevEffectStart);
  popComponentEffectDuration(prevEffectDuration);
  popComponentEffectErrors(prevEffectErrors);
  popComponentEffectDidSpawnUpdate(prevEffectDidSpawnUpdate);
}


// TODO 待分析
function recursivelyTraverseReappearLayoutEffects(
  finishedRoot: FiberRoot,
  parentFiber: Fiber,
  includeWorkInProgressEffects: boolean,
) {
  // This function visits both newly finished work and nodes that were re-used
  // from a previously committed tree. We cannot check non-static flags if the
  // node was reused.
  const childShouldIncludeWorkInProgressEffects =
    includeWorkInProgressEffects &&
    (parentFiber.subtreeFlags & LayoutMask) !== NoFlags;

  // TODO (Offscreen) Check: flags & (RefStatic | LayoutStatic)
  let child = parentFiber.child;
  while (child !== null) {
    const current = child.alternate;
    reappearLayoutEffects(
      finishedRoot,
      current,
      child,
      childShouldIncludeWorkInProgressEffects,
    );
    child = child.sibling;
  }
}

// TODO 待注解
function commitOffscreenPassiveMountEffects(
  current: Fiber | null,
  finishedWork: Fiber,
  instance: OffscreenInstance,
) {
  let previousCache: Cache | null = null;
  if (
    current !== null &&
    current.memoizedState !== null &&
    current.memoizedState.cachePool !== null
  ) {
    previousCache = current.memoizedState.cachePool.pool;
  }
  let nextCache: Cache | null = null;
  if (
    finishedWork.memoizedState !== null &&
    finishedWork.memoizedState.cachePool !== null
  ) {
    nextCache = finishedWork.memoizedState.cachePool.pool;
  }
  // Retain/release the cache used for pending (suspended) nodes.
  // Note that this is only reached in the non-suspended/visible case:
  // when the content is suspended/hidden, the retain/release occurs
  // via the parent Suspense component (see case above).
  if (nextCache !== previousCache) {
    if (nextCache != null) {
      retainCache(nextCache);
    }
    if (previousCache != null) {
      releaseCache(previousCache);
    }
  }

  if (enableTransitionTracing) {
    // TODO: Pre-rendering should not be counted as part of a transition. We
    // may add separate logs for pre-rendering, but it's not part of the
    // primary metrics.
    const offscreenState: OffscreenState = finishedWork.memoizedState;
    const queue: OffscreenQueue | null = finishedWork.updateQueue as any;

    // $FlowFixMe[invalid-compare]
    const isHidden = offscreenState !== null;
    if (queue !== null) {
      if (isHidden) {
        const transitions = queue.transitions;
        if (transitions !== null) {
          transitions.forEach(transition => {
            // Add all the transitions saved in the update queue during
            // the render phase (ie the transitions associated with this boundary)
            // into the transitions set.
            if (instance._transitions === null) {
              instance._transitions = new Set();
            }
            instance._transitions.add(transition);
          });
        }

        const markerInstances = queue.markerInstances;
        if (markerInstances !== null) {
          markerInstances.forEach(markerInstance => {
            const markerTransitions = markerInstance.transitions;
            // There should only be a few tracing marker transitions because
            // they should be only associated with the transition that
            // caused them
            if (markerTransitions !== null) {
              markerTransitions.forEach(transition => {
                if (instance._transitions === null) {
                  instance._transitions = new Set();
                } else if (instance._transitions.has(transition)) {
                  if (markerInstance.pendingBoundaries === null) {
                    markerInstance.pendingBoundaries = new Map();
                  }
                  if (instance._pendingMarkers === null) {
                    instance._pendingMarkers = new Set();
                  }

                  instance._pendingMarkers.add(markerInstance);
                }
              });
            }
          });
        }
      }

      finishedWork.updateQueue = null;
    }

    commitTransitionProgress(finishedWork);

    // TODO: Refactor this into an if/else branch
    if (!isHidden) {
      instance._transitions = null;
      instance._pendingMarkers = null;
    }
  }
}

// 增加新缓存引用，释放旧缓存引用
function commitCachePassiveMountEffect(
  current: Fiber | null,
  finishedWork: Fiber,
) {
  let previousCache: Cache | null = null;
  if (finishedWork.alternate !== null) {
    previousCache = finishedWork.alternate.memoizedState.cache;
  }
  const nextCache = finishedWork.memoizedState.cache;
  // Retain/release the cache. In theory the cache component
  // could be "borrowing" a cache instance owned by some parent,
  // in which case we could avoid retaining/releasing. But it
  // is non-trivial to determine when that is the case, so we
  // always retain/release.
  if (nextCache !== previousCache) {
    retainCache(nextCache);
    if (previousCache != null) {
      releaseCache(previousCache);
    }
  }
}

function commitTracingMarkerPassiveMountEffect(finishedWork: Fiber) {
  // Get the transitions that were initiatized during the render
  // and add a start transition callback for each of them
  // We will only call this on initial mount of the tracing marker
  // only if there are no suspense children
  const instance = finishedWork.stateNode;
  if (instance.transitions !== null && instance.pendingBoundaries === null) {
    addMarkerCompleteCallbackToPendingTransition(
      finishedWork.memoizedProps.name,
      instance.transitions,
    );
    instance.transitions = null;
    instance.pendingBoundaries = null;
    instance.aborts = null;
    instance.name = null;
  }
}


// 遍历 Fiber 子树，并根据每个 Fiber 的类型，执行 useEffect、缓存、
// Offscreen 和 View Transition 等 Passive 阶段工作。
export function commitPassiveMountEffects(
  root: FiberRoot,
  finishedWork: Fiber,
  committedLanes: Lanes,
  committedTransitions: Array<Transition> | null,
  renderEndTime: number, // Profiling-only
): void {
  // 重置计时器
  resetComponentEffectTimers();
  // 处理单个 Fiber 节点在 Passive 阶段需要执行的工作，并继续遍历它的子树。
  commitPassiveMountOnFiber(
    root,
    finishedWork,
    committedLanes,
    committedTransitions,
    enableProfilerTimer && enableComponentPerformanceTrack ? renderEndTime : 0,
  );
}


// 通常不直接执行 useEffect，而是负责寻找需要处理的 Fiber：
// 然后给回commitPassiveMountOnFiber去处理
function recursivelyTraversePassiveMountEffects(
  root: FiberRoot,
  parentFiber: Fiber,
  committedLanes: Lanes,
  committedTransitions: Array<Transition> | null,
  endTime: number, // Profiling-only. The start time of the next Fiber or root completion.
) {
   // 判断本次任务是否允许处理 View Transition
  const isViewTransitionEligible =
    enableViewTransition &&
    includesOnlyViewTransitionEligibleLanes(committedLanes);
  // TODO: We could optimize this by marking these with the Passive subtree flag in the render phase.
  // 决定需要查找哪些effect
  const subtreeMask = isViewTransitionEligible
    ? PassiveTransitionMask
    : PassiveMask;
  if (
    // 子树中存在相关工作，遍历直接子节点
    parentFiber.subtreeFlags & subtreeMask ||
    // If this subtree rendered with profiling this commit, we need to visit it to log it.
    (enableProfilerTimer &&
      enableComponentPerformanceTrack &&
      parentFiber.actualDuration !== 0 &&
      (parentFiber.alternate === null ||
        parentFiber.alternate.child !== parentFiber.child))
  ) {
    let child = parentFiber.child;
    while (child !== null) {
      if (enableProfilerTimer && enableComponentPerformanceTrack) {
        const nextSibling = child.sibling;
        // 处理这个子节点，并由它继续向下递归
        commitPassiveMountOnFiber(
          root,
          child,
          committedLanes,
          committedTransitions,
          nextSibling !== null
            ? (nextSibling.actualStartTime as any as number)
            : endTime,
        );
        child = nextSibling;
      } else {
        // 处理这个子节点，并由它继续向下递归
        commitPassiveMountOnFiber(
          root,
          child,
          committedLanes,
          committedTransitions,
          0,
        );
         // 移动到下一个兄弟节点
        child = child.sibling;
      }
    }
  } else if (isViewTransitionEligible) {
    // We are inside an updated subtree. Any mutations that affected the
    // parent HostInstance's layout or set of children (such as reorders)
    // might have also affected the positioning or size of the inner
    // ViewTransitions. Therefore we need to restore those too.
    // 子树没有普通 Passive 工作，
    // 但父级布局变化可能影响内部 View Transition 的位置或尺寸
    restoreNestedViewTransitions(parentFiber);
  }
}

let inHydratedSubtree = false;

// 处理一个 Fiber 节点及其子树在 Passive Mount 阶段需要执行的工作，最主要的是执行新的 useEffect 回调。
// 处理单个 Fiber 节点在 Passive 阶段需要执行的工作，并继续遍历它的子树。
// 函数组件：执行本次需要运行的 useEffect 回调。
// HostRoot、CacheComponent：增加新 Cache 的引用，释放旧 Cache。
// OffscreenComponent：根据显示或隐藏状态，更新、断开或重新连接子树的 Effect。
// ViewTransitionComponent：恢复进入、退出或更新动画使用的临时样式。
// Transition Tracing：处理 Transition 开始、完成等回调。
// 其他 Fiber：继续向下遍历子节点。
// 主要是执行restoreEnterOrExitViewTransitions
// recursivelyTraversePassiveMountEffects
// commitHookPassiveMountEffects

function commitPassiveMountOnFiber(
  finishedRoot: FiberRoot,
  // 要处理的fiber节点
  finishedWork: Fiber,
  // 任务集合
  committedLanes: Lanes,
  // 相关的过渡对象
  committedTransitions: Array<Transition> | null,
  endTime: number, // Profiling-only. The start time of the next Fiber or root completion.
): void {
  const prevEffectStart = pushComponentEffectStart();
  const prevEffectDuration = pushComponentEffectDuration();
  const prevEffectErrors = pushComponentEffectErrors();
  const prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();
  const prevDeepEquality = pushDeepEquality();
  // 判断本次任务是否允许处理 View Transition
  const isViewTransitionEligible = enableViewTransition
    ? includesOnlyViewTransitionEligibleLanes(committedLanes)
    : false;

  if (
    // 本次提交允许 View Transition
    isViewTransitionEligible &&
    // 当前 Fiber 没有旧 Fiber，说明它是新节点
    finishedWork.alternate === null &&
    // We can't use the Placement flag here because it gets reset earlier. Instead,
    // we check if this is the root of the insertion by checking if the parent
    // was previous existing.
    // 当前 Fiber 不是根节点
    finishedWork.return !== null &&
    // 父节点以前已经存在，说明当前 Fiber 是本次新插入子树的根
    finishedWork.return.alternate !== null
  ) {
    // This was a new mount. This means we could've triggered an enter animation on
    // the content. Restore the view transitions if there were any assigned in the
    // snapshot phase.
    // 恢复此前为进入动画临时设置的 View Transition 样式
    // 递归遍历处理paired和host组件样式
    restoreEnterOrExitViewTransitions(finishedWork);
  }

  // When updating this function, also update reconnectPassiveEffects, which does
  // most of the same things when an offscreen tree goes from hidden -> visible,
  // or when toggling effects inside a hidden tree.
  // 获取effect标记集合
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      // If this component rendered in Profiling mode (DEV or in Profiler component) then log its
      // render time. We do this after the fact in the passive effect to avoid the overhead of this
      // getting in the way of the render characteristics and avoid the overhead of unwinding
      // uncommitted renders.
      if (
        enableProfilerTimer &&
        enableComponentPerformanceTrack &&
        (finishedWork.mode & ProfileMode) !== NoMode &&
        (finishedWork.actualStartTime as any as number) > 0 &&
        (finishedWork.flags & PerformedWork) !== NoFlags
      ) {
        logComponentRender(
          finishedWork,
          finishedWork.actualStartTime as any as number,
          endTime,
          inHydratedSubtree,
          committedLanes,
        );
      }
      // 先递归处理子节点
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime,
      );
      // 是否需要执行passive的hook 即执行useEffect
      if (flags & Passive) {
        commitHookPassiveMountEffects(
          finishedWork,
          HookPassive | HookHasEffect,
        );
      }
      break;
    }
    case ClassComponent: {
      // If this component rendered in Profiling mode (DEV or in Profiler component) then log its
      // render time. We do this after the fact in the passive effect to avoid the overhead of this
      // getting in the way of the render characteristics and avoid the overhead of unwinding
      // uncommitted renders.
      if (
        enableProfilerTimer &&
        enableComponentPerformanceTrack &&
        (finishedWork.mode & ProfileMode) !== NoMode &&
        (finishedWork.actualStartTime as any as number) > 0
      ) {
        if ((finishedWork.flags & DidCapture) !== NoFlags) {
          logComponentErrored(
            finishedWork,
            finishedWork.actualStartTime as any as number,
            endTime,
            // TODO: The captured values are all hidden inside the updater/callback closures so
            // we can't get to the errors but they're there so we should be able to log them.
            [],
          );
        } else if ((finishedWork.flags & PerformedWork) !== NoFlags) {
          logComponentRender(
            finishedWork,
            finishedWork.actualStartTime as any as number,
            endTime,
            inHydratedSubtree,
            committedLanes,
          );
        }
      }
      // 遍历子节点
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime,
      );
      break;
    }
    case HostRoot: {
      const prevProfilerEffectDuration = pushNestedEffectDurations();

      const wasInHydratedSubtree = inHydratedSubtree;
      if (enableProfilerTimer && enableComponentPerformanceTrack) {
        // Detect if this was a hydration commit by look at if the previous state was
        // dehydrated and this wasn't a forced client render.
        inHydratedSubtree =
          finishedWork.alternate !== null &&
          (finishedWork.alternate.memoizedState as RootState).isDehydrated &&
          (finishedWork.flags & ForceClientRender) === NoFlags;
      }
      // 遍历子节点
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime,
      );

      if (enableProfilerTimer && enableComponentPerformanceTrack) {
        inHydratedSubtree = wasInHydratedSubtree;
      }
      // 如果本次提交允许 View Transition
      if (isViewTransitionEligible) {
        // $FlowFixMe[constant-condition]
        // DOM 渲染器支持直接修改 DOM，
        // 并且 Root 的 view-transition-name 曾被临时取消
        if (supportsMutation && rootViewTransitionNameCanceled) {
          // 恢复根容器的 view-transition-name
          restoreRootViewTransitionName(finishedRoot.containerInfo);
        }
      }

      if (flags & Passive) {
         // 默认没有旧缓存
        let previousCache: Cache | null = null;
        // 存在旧 Fiber 时，读取旧缓存
        if (finishedWork.alternate !== null) {
          previousCache = finishedWork.alternate.memoizedState.cache;
        }
        // 读取本次提交使用的新缓存
        const nextCache = finishedWork.memoizedState.cache;
        // Retain/release the root cache.
        // Note that on initial mount, previousCache and nextCache will be the same
        // and this retain won't occur. To counter this, we instead retain the HostRoot's
        // initial cache when creating the root itself (see createFiberRoot() in
        // ReactFiberRoot.js). Subsequent updates that change the cache are reflected
        // here, such that previous/next caches are retained correctly.
        // 缓存发生变化
        if (nextCache !== previousCache) {
          // 增加新缓存引用次数
          retainCache(nextCache);
          // 旧缓存存在时，减少旧缓存引用次数
          if (previousCache != null) {
            releaseCache(previousCache);
          }
        }
        // 处理 Transition 开始、完成等追踪回调
        if (enableTransitionTracing) {
          // Get the transitions that were initiatized during the render
          // and add a start transition callback for each of them
          const root: FiberRoot = finishedWork.stateNode;
          const incompleteTransitions = root.incompleteTransitions;
          // Initial render
          if (committedTransitions !== null) {
            committedTransitions.forEach(transition => {
              addTransitionStartCallbackToPendingTransition(transition);
            });

            clearTransitionsForLanes(finishedRoot, committedLanes);
          }

          incompleteTransitions.forEach((markerInstance, transition) => {
            const pendingBoundaries = markerInstance.pendingBoundaries;
            if (pendingBoundaries === null || pendingBoundaries.size === 0) {
              if (markerInstance.aborts === null) {
                addTransitionCompleteCallbackToPendingTransition(transition);
              }
              incompleteTransitions.delete(transition);
            }
          });

          clearTransitionsForLanes(finishedRoot, committedLanes);
        }
      }
      if (enableProfilerTimer && enableProfilerCommitHooks) {
        finishedRoot.passiveEffectDuration += popNestedEffectDurations(
          prevProfilerEffectDuration,
        );
      }
      break;
    }
    case Profiler: {
      // Only Profilers with work in their subtree will have a Passive effect scheduled.
      if (flags & Passive) {
        const prevProfilerEffectDuration = pushNestedEffectDurations();
        // 递归处理子节点
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          endTime,
        );

        const profilerInstance = finishedWork.stateNode;

        if (enableProfilerTimer && enableProfilerCommitHooks) {
          // Bubble times to the next nearest ancestor Profiler.
          // After we process that Profiler, we'll bubble further up.
          profilerInstance.passiveEffectDuration += bubbleNestedEffectDurations(
            prevProfilerEffectDuration,
          );
        }

        commitProfilerPostCommit(
          finishedWork,
          finishedWork.alternate,
          // This value will still reflect the previous commit phase.
          // It does not get reset until the start of the next commit phase.
          commitStartTime,
          profilerInstance.passiveEffectDuration,
        );
      } else {
        // 递归处理子节点
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          endTime,
        );
      }
      break;
    }
    case ActivityComponent: {
      const wasInHydratedSubtree = inHydratedSubtree;
      if (enableProfilerTimer && enableComponentPerformanceTrack) {
        const prevState: ActivityState | null =
          finishedWork.alternate !== null
            ? finishedWork.alternate.memoizedState
            : null;
        const nextState: ActivityState | null = finishedWork.memoizedState;
        if (prevState !== null && nextState === null) {
          // This was dehydrated but is no longer dehydrated. We may have now either hydrated it
          // or client rendered it.
          const deletions = finishedWork.deletions;
          if (
            deletions !== null &&
            deletions.length > 0 &&
            deletions[0].tag === DehydratedFragment
          ) {
            // This was an abandoned hydration that deleted the dehydrated fragment. That means we
            // are not hydrating this Suspense boundary.
            inHydratedSubtree = false;
            const hydrationErrors = prevState.hydrationErrors;
            // If there were no hydration errors, that suggests that this was an intentional client
            // rendered boundary.
            if (hydrationErrors !== null) {
              const startTime: number = finishedWork.actualStartTime as any;
              logComponentErrored(
                finishedWork,
                startTime,
                endTime,
                hydrationErrors,
              );
            }
          } else {
            // If any children committed they were hydrated.
            inHydratedSubtree = true;
          }
        } else {
          inHydratedSubtree = false;
        }
      }
      // 递归处理子节点
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime,
      );

      if (enableProfilerTimer && enableComponentPerformanceTrack) {
        inHydratedSubtree = wasInHydratedSubtree;
      }
      break;
    }
    case SuspenseComponent: {
      const wasInHydratedSubtree = inHydratedSubtree;
      if (enableProfilerTimer && enableComponentPerformanceTrack) {
        const prevState: SuspenseState | null =
          finishedWork.alternate !== null
            ? finishedWork.alternate.memoizedState
            : null;
        const nextState: SuspenseState | null = finishedWork.memoizedState;
        if (
          prevState !== null &&
          prevState.dehydrated !== null &&
          (nextState === null || nextState.dehydrated === null)
        ) {
          // This was dehydrated but is no longer dehydrated. We may have now either hydrated it
          // or client rendered it.
          const deletions = finishedWork.deletions;
          if (
            deletions !== null &&
            deletions.length > 0 &&
            deletions[0].tag === DehydratedFragment
          ) {
            // This was an abandoned hydration that deleted the dehydrated fragment. That means we
            // are not hydrating this Suspense boundary.
            inHydratedSubtree = false;
            const hydrationErrors = prevState.hydrationErrors;
            // If there were no hydration errors, that suggests that this was an intentional client
            // rendered boundary.
            if (hydrationErrors !== null) {
              const startTime: number = finishedWork.actualStartTime as any;
              logComponentErrored(
                finishedWork,
                startTime,
                endTime,
                hydrationErrors,
              );
            }
          } else {
            // If any children committed they were hydrated.
            inHydratedSubtree = true;
          }
        } else {
          inHydratedSubtree = false;
        }
      }
      // 递归处理子节点
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime,
      );

      if (enableProfilerTimer && enableComponentPerformanceTrack) {
        inHydratedSubtree = wasInHydratedSubtree;
      }
      break;
    }
    case LegacyHiddenComponent: {
      // 只有启用旧版 Hidden 功能才处理
      if (enableLegacyHidden) {
        // 处理内部子树
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          endTime,
        );

        if (flags & Passive) {
          const current = finishedWork.alternate;
          // 获取 Offscreen 实例
          const instance: OffscreenInstance = finishedWork.stateNode;
          // 更新 Offscreen 缓存等 Passive 状态
          commitOffscreenPassiveMountEffects(current, finishedWork, instance);
        }
      }
      break;
    }
    case OffscreenComponent: {
      // TODO: Pass `current` as argument to this function
      // 获取 Offscreen 实例
      const instance: OffscreenInstance = finishedWork.stateNode;
      const current = finishedWork.alternate;
      // 获取更新后的隐藏状态
      const nextState: OffscreenState | null = finishedWork.memoizedState;
       // memoizedState 非空表示更新后隐藏
      const isHidden = nextState !== null;

      if (isHidden) {
        if (
          // 本次允许 View Transition
          isViewTransitionEligible &&
          // 更新前存在
          current !== null &&
          // 更新前 memoizedState 为空，表示以前显示
          current.memoizedState === null
        ) {
          // Content is now hidden but wasn't before. This means we could've
          // triggered an exit animation on the content. Restore the view
          // transitions if there were any assigned in the snapshot phase.
          // 组件从显示变为隐藏，恢复退出动画的临时样式
          restoreEnterOrExitViewTransitions(current);
        }
        // 检查 Passive Effects 是否仍然处于连接状态
        if (instance._visibility & OffscreenPassiveEffectsConnected) {
          // The effects are currently connected. Update them.
          // Effect 仍连接，正常处理本次变化的 Effect
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            endTime,
          );
        } else {
          if (disableLegacyMode || finishedWork.mode & ConcurrentMode) {
            // The effects are currently disconnected. Since the tree is hidden,
            // don't connect them. This also applies to the initial render.
            // "Atomic" effects are ones that need to fire on every commit,
            // even during pre-rendering. An example is updating the reference
            // count on cache instances.
            // 并发模式下，隐藏子树不重新连接普通 useEffect
            // 只执行缓存引用计数等必须执行的原子 Passive 工作
            recursivelyTraverseAtomicPassiveEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions,
              endTime,
            );
          } else {
            // Legacy Mode: Fire the effects even if the tree is hidden.
            instance._visibility |= OffscreenPassiveEffectsConnected;
            // 执行隐藏子树的 Passive Effect
            recursivelyTraversePassiveMountEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions,
              endTime,
            );
          }
        }
      } else {
        // Tree is visible
        if (
          isViewTransitionEligible &&
          current !== null &&
          // 更新前 memoizedState 非空，表示以前隐藏
          current.memoizedState !== null
        ) {
          // Content is now visible but wasn't before. This means we could've
          // triggered an enter animation on the content. Restore the view
          // transitions if there were any assigned in the snapshot phase.
          // 组件从隐藏变为显示，恢复进入动画的临时样式
          restoreEnterOrExitViewTransitions(finishedWork);
        }
        // Effect 原本就是连接状态
        if (instance._visibility & OffscreenPassiveEffectsConnected) {
          // The effects are currently connected. Update them.
           // 正常处理本次变化的 Effect
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            endTime,
          );
        } else {
          // The effects are currently disconnected. Reconnect them, while also
          // firing effects inside newly mounted trees. This also applies to
          // the initial render.
          // Effect 原本断开，现在组件显示，需要重新连接
          instance._visibility |= OffscreenPassiveEffectsConnected;
          // 检查本次生成的子树中是否存在 Passive 工作
          const includeWorkInProgressEffects =
            (finishedWork.subtreeFlags & PassiveMask) !== NoFlags ||
            (enableProfilerTimer &&
              enableComponentPerformanceTrack &&
              finishedWork.actualDuration !== 0 &&
              (finishedWork.alternate === null ||
                finishedWork.alternate.child !== finishedWork.child));
          // 重新执行此前因隐藏而断开的 Effect，
          // 同时执行本次新产生的 Effect
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects,
            endTime,
          );

          if (
            enableProfilerTimer &&
            enableProfilerCommitHooks &&
            enableComponentPerformanceTrack &&
            (finishedWork.mode & ProfileMode) !== NoMode &&
            !inHydratedSubtree
          ) {
            // Log the reappear in the render phase.
            const startTime = finishedWork.actualStartTime as any as number;
            if (startTime >= 0 && endTime - startTime > 0.05) {
              logComponentReappeared(finishedWork, startTime, endTime);
            }
            if (
              componentEffectStartTime >= 0 &&
              componentEffectEndTime >= 0 &&
              componentEffectEndTime - componentEffectStartTime > 0.05
            ) {
              logComponentReappeared(
                finishedWork,
                componentEffectStartTime,
                componentEffectEndTime,
              );
            }
          }
        }
      }

      if (flags & Passive) {
        // 更新 Offscreen 使用的缓存引用等状态
        commitOffscreenPassiveMountEffects(current, finishedWork, instance);
      }
      break;
    }
    case CacheComponent: {
      // 先处理子节点
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime,
      );
      if (flags & Passive) {
        // TODO: Pass `current` as argument to this function
        const current = finishedWork.alternate;
        // 增加新缓存引用，释放旧缓存引用
        commitCachePassiveMountEffect(current, finishedWork);
      }
      break;
    }
    case ViewTransitionComponent: {
      // View Transition 功能已开启
      if (enableViewTransition) {
        // 本次 Lane 允许执行 View Transition
        if (isViewTransitionEligible) {
          const current = finishedWork.alternate;
          if (current === null) {
            // 新挂载节点的进入动画已经在前面处理
            // This is a new mount. We should have handled this as part of the
            // Placement effect or it is deeper inside a entering transition.
          } else {
            // 更新已有节点，恢复更新动画使用的临时样式
            // Something mutated within this subtree. This might have caused
            // something to cross-fade if we didn't already cancel it.
            // If not, restore it.
            restoreUpdateViewTransition(current, finishedWork);
          }
        }
        // 继续处理内部子节点
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          endTime,
        );
        break;
      }
      // Fallthrough
    }
    case TracingMarkerComponent: {
      if (enableTransitionTracing) {
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          endTime,
        );
        if (flags & Passive) {
          commitTracingMarkerPassiveMountEffect(finishedWork);
        }
        break;
      }
      // Intentional fallthrough to next branch
    }
    default: {
      // 当前类型没有专门的 Passive 工作，只处理子节点
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime,
      );
      break;
    }
  }

  if (
    enableProfilerTimer &&
    enableProfilerCommitHooks &&
    enableComponentPerformanceTrack &&
    (finishedWork.mode & ProfileMode) !== NoMode
  ) {
    const isMount =
      !inHydratedSubtree &&
      finishedWork.alternate === null &&
      finishedWork.return !== null &&
      finishedWork.return.alternate !== null;
    if (isMount) {
      // Log the mount in the render phase.
      const startTime = finishedWork.actualStartTime as any as number;
      if (startTime >= 0 && endTime - startTime > 0.05) {
        logComponentMount(finishedWork, startTime, endTime);
      }
    }
    if (componentEffectStartTime >= 0 && componentEffectEndTime >= 0) {
      if (componentEffectSpawnedUpdate || componentEffectDuration > 0.05) {
        logComponentEffect(
          finishedWork,
          componentEffectStartTime,
          componentEffectEndTime,
          componentEffectDuration,
          componentEffectErrors,
        );
      }
      if (isMount && componentEffectEndTime - componentEffectStartTime > 0.05) {
        logComponentMount(
          finishedWork,
          componentEffectStartTime,
          componentEffectEndTime,
        );
      }
    }
  }

  popComponentEffectStart(prevEffectStart);
  popComponentEffectDuration(prevEffectDuration);
  popComponentEffectErrors(prevEffectErrors);
  popComponentEffectDidSpawnUpdate(prevEffectDidSpawnUpdate);
  popDeepEquality(prevDeepEquality);
}

// TODO 待注解
function recursivelyTraverseReconnectPassiveEffects(
  finishedRoot: FiberRoot,
  parentFiber: Fiber,
  committedLanes: Lanes,
  committedTransitions: Array<Transition> | null,
  includeWorkInProgressEffects: boolean,
  endTime: number,
) {
  // This function visits both newly finished work and nodes that were re-used
  // from a previously committed tree. We cannot check non-static flags if the
  // node was reused.
  const childShouldIncludeWorkInProgressEffects =
    includeWorkInProgressEffects &&
    ((parentFiber.subtreeFlags & PassiveMask) !== NoFlags ||
      (enableProfilerTimer &&
        enableComponentPerformanceTrack &&
        parentFiber.actualDuration !== 0 &&
        (parentFiber.alternate === null ||
          parentFiber.alternate.child !== parentFiber.child)));

  // TODO (Offscreen) Check: flags & (RefStatic | LayoutStatic)
  let child = parentFiber.child;
  while (child !== null) {
    if (enableProfilerTimer && enableComponentPerformanceTrack) {
      const nextSibling = child.sibling;
      reconnectPassiveEffects(
        finishedRoot,
        child,
        committedLanes,
        committedTransitions,
        childShouldIncludeWorkInProgressEffects,
        nextSibling !== null
          ? (nextSibling.actualStartTime as any as number)
          : endTime,
      );
      child = nextSibling;
    } else {
      reconnectPassiveEffects(
        finishedRoot,
        child,
        committedLanes,
        committedTransitions,
        childShouldIncludeWorkInProgressEffects,
        endTime,
      );
      child = child.sibling;
    }
  }
}

export function reconnectPassiveEffects(
  finishedRoot: FiberRoot,
  finishedWork: Fiber,
  committedLanes: Lanes,
  committedTransitions: Array<Transition> | null,
  // This function visits both newly finished work and nodes that were re-used
  // from a previously committed tree. We cannot check non-static flags if the
  // node was reused.
  includeWorkInProgressEffects: boolean,
  endTime: number, // Profiling-only. The start time of the next Fiber or root completion.
) {
  const prevEffectStart = pushComponentEffectStart();
  const prevEffectDuration = pushComponentEffectDuration();
  const prevEffectErrors = pushComponentEffectErrors();
  const prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();
  const prevDeepEquality = pushDeepEquality();

  // If this component rendered in Profiling mode (DEV or in Profiler component) then log its
  // render time. We do this after the fact in the passive effect to avoid the overhead of this
  // getting in the way of the render characteristics and avoid the overhead of unwinding
  // uncommitted renders.
  if (
    enableProfilerTimer &&
    enableComponentPerformanceTrack &&
    includeWorkInProgressEffects &&
    (finishedWork.mode & ProfileMode) !== NoMode &&
    (finishedWork.actualStartTime as any as number) > 0 &&
    (finishedWork.flags & PerformedWork) !== NoFlags
  ) {
    logComponentRender(
      finishedWork,
      finishedWork.actualStartTime as any as number,
      endTime,
      inHydratedSubtree,
      committedLanes,
    );
  }

  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      recursivelyTraverseReconnectPassiveEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        includeWorkInProgressEffects,
        endTime,
      );
      // TODO: Check for PassiveStatic flag
      commitHookPassiveMountEffects(finishedWork, HookPassive);
      break;
    }
    // Unlike commitPassiveMountOnFiber, we don't need to handle HostRoot
    // because this function only visits nodes that are inside an
    // Offscreen fiber.
    // case HostRoot: {
    //  ...
    // }
    case LegacyHiddenComponent: {
      if (enableLegacyHidden) {
        recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          includeWorkInProgressEffects,
          endTime,
        );

        if (includeWorkInProgressEffects && flags & Passive) {
          // TODO: Pass `current` as argument to this function
          const current: Fiber | null = finishedWork.alternate;
          const instance: OffscreenInstance = finishedWork.stateNode;
          commitOffscreenPassiveMountEffects(current, finishedWork, instance);
        }
      }
      break;
    }
    case OffscreenComponent: {
      const instance: OffscreenInstance = finishedWork.stateNode;
      const nextState: OffscreenState | null = finishedWork.memoizedState;

      const isHidden = nextState !== null;

      if (isHidden) {
        if (instance._visibility & OffscreenPassiveEffectsConnected) {
          // The effects are currently connected. Update them.
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects,
            endTime,
          );
        } else {
          if (disableLegacyMode || finishedWork.mode & ConcurrentMode) {
            // The effects are currently disconnected. Since the tree is hidden,
            // don't connect them. This also applies to the initial render.
            // "Atomic" effects are ones that need to fire on every commit,
            // even during pre-rendering. An example is updating the reference
            // count on cache instances.
            recursivelyTraverseAtomicPassiveEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions,
              endTime,
            );
          } else {
            // Legacy Mode: Fire the effects even if the tree is hidden.
            instance._visibility |= OffscreenPassiveEffectsConnected;
            recursivelyTraverseReconnectPassiveEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions,
              includeWorkInProgressEffects,
              endTime,
            );
          }
        }
      } else {
        // Tree is visible

        // Since we're already inside a reconnecting tree, it doesn't matter
        // whether the effects are currently connected. In either case, we'll
        // continue traversing the tree and firing all the effects.
        //
        // We do need to set the "connected" flag on the instance, though.
        instance._visibility |= OffscreenPassiveEffectsConnected;

        recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          includeWorkInProgressEffects,
          endTime,
        );
      }

      if (includeWorkInProgressEffects && flags & Passive) {
        // TODO: Pass `current` as argument to this function
        const current: Fiber | null = finishedWork.alternate;
        commitOffscreenPassiveMountEffects(current, finishedWork, instance);
      }
      break;
    }
    case CacheComponent: {
      recursivelyTraverseReconnectPassiveEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        includeWorkInProgressEffects,
        endTime,
      );
      if (includeWorkInProgressEffects && flags & Passive) {
        // TODO: Pass `current` as argument to this function
        const current = finishedWork.alternate;
        commitCachePassiveMountEffect(current, finishedWork);
      }
      break;
    }
    case TracingMarkerComponent: {
      if (enableTransitionTracing) {
        recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          includeWorkInProgressEffects,
          endTime,
        );
        if (includeWorkInProgressEffects && flags & Passive) {
          commitTracingMarkerPassiveMountEffect(finishedWork);
        }
        break;
      }
      // Intentional fallthrough to next branch
    }
    default: {
      recursivelyTraverseReconnectPassiveEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        includeWorkInProgressEffects,
        endTime,
      );
      break;
    }
  }

  if (
    enableProfilerTimer &&
    enableProfilerCommitHooks &&
    enableComponentPerformanceTrack &&
    (finishedWork.mode & ProfileMode) !== NoMode &&
    componentEffectStartTime >= 0 &&
    componentEffectEndTime >= 0 &&
    (componentEffectSpawnedUpdate || componentEffectDuration > 0.05)
  ) {
    logComponentEffect(
      finishedWork,
      componentEffectStartTime,
      componentEffectEndTime,
      componentEffectDuration,
      componentEffectErrors,
    );
  }

  popComponentEffectStart(prevEffectStart);
  popComponentEffectDuration(prevEffectDuration);
  popComponentEffectErrors(prevEffectErrors);
  popComponentEffectDidSpawnUpdate(prevEffectDidSpawnUpdate);
  popDeepEquality(prevDeepEquality);
}

// TODO 待注解
function recursivelyTraverseAtomicPassiveEffects(
  finishedRoot: FiberRoot,
  parentFiber: Fiber,
  committedLanes: Lanes,
  committedTransitions: Array<Transition> | null,
  endTime: number, // Profiling-only. The start time of the next Fiber or root completion.
) {
  // "Atomic" effects are ones that need to fire on every commit, even during
  // pre-rendering. We call this function when traversing a hidden tree whose
  // regular effects are currently disconnected.
  // TODO: Add special flag for atomic effects
  if (
    parentFiber.subtreeFlags & PassiveMask ||
    (enableProfilerTimer &&
      enableComponentPerformanceTrack &&
      parentFiber.actualDuration !== 0 &&
      (parentFiber.alternate === null ||
        parentFiber.alternate.child !== parentFiber.child))
  ) {
    let child = parentFiber.child;
    while (child !== null) {
      if (enableProfilerTimer && enableComponentPerformanceTrack) {
        const nextSibling = child.sibling;
        commitAtomicPassiveEffects(
          finishedRoot,
          child,
          committedLanes,
          committedTransitions,
          nextSibling !== null
            ? (nextSibling.actualStartTime as any as number)
            : endTime,
        );
        child = nextSibling;
      } else {
        commitAtomicPassiveEffects(
          finishedRoot,
          child,
          committedLanes,
          committedTransitions,
          endTime,
        );
        child = child.sibling;
      }
    }
  }
}

function commitAtomicPassiveEffects(
  finishedRoot: FiberRoot,
  finishedWork: Fiber,
  committedLanes: Lanes,
  committedTransitions: Array<Transition> | null,
  endTime: number, // Profiling-only. The start time of the next Fiber or root completion.
) {
  const prevDeepEquality = pushDeepEquality();

  // If this component rendered in Profiling mode (DEV or in Profiler component) then log its
  // render time. A render can happen even if the subtree is offscreen.
  if (
    enableProfilerTimer &&
    enableComponentPerformanceTrack &&
    (finishedWork.mode & ProfileMode) !== NoMode &&
    (finishedWork.actualStartTime as any as number) > 0 &&
    (finishedWork.flags & PerformedWork) !== NoFlags
  ) {
    logComponentRender(
      finishedWork,
      finishedWork.actualStartTime as any as number,
      endTime,
      inHydratedSubtree,
      committedLanes,
    );
  }

  // "Atomic" effects are ones that need to fire on every commit, even during
  // pre-rendering. We call this function when traversing a hidden tree whose
  // regular effects are currently disconnected.
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case OffscreenComponent: {
      recursivelyTraverseAtomicPassiveEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime,
      );
      if (flags & Passive) {
        // TODO: Pass `current` as argument to this function
        const current = finishedWork.alternate;
        const instance: OffscreenInstance = finishedWork.stateNode;
        commitOffscreenPassiveMountEffects(current, finishedWork, instance);
      }
      break;
    }
    case CacheComponent: {
      recursivelyTraverseAtomicPassiveEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime,
      );
      if (flags & Passive) {
        // TODO: Pass `current` as argument to this function
        const current = finishedWork.alternate;
        commitCachePassiveMountEffect(current, finishedWork);
      }
      break;
    }
    default: {
      recursivelyTraverseAtomicPassiveEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime,
      );
      break;
    }
  }

  popDeepEquality(prevDeepEquality);
}

export function commitPassiveUnmountEffects(finishedWork: Fiber): void {
  // 重置计时器、
  resetComponentEffectTimers();
  // 执行effect的清理和fiber节点清理
  commitPassiveUnmountOnFiber(finishedWork);
}

// If we're inside a brand new tree, or a tree that was already visible, then we
// should only suspend host components that have a ShouldSuspendCommit flag.
// Components without it haven't changed since the last commit, so we can skip
// over those.
//
// When we enter a tree that is being revealed (going from hidden -> visible),
// we need to suspend _any_ component that _may_ suspend. Even if they're
// already in the "current" tree. Because their visibility has changed, the
// browser may not have prerendered them yet. So we check the MaySuspendCommit
// flag instead.
//
// Note that MaySuspendCommit and ShouldSuspendCommit also includes named
// ViewTransitions so that we know to also visit those to collect appearing
// pairs.
let suspenseyCommitFlag: Flags = ShouldSuspendCommit;
export function accumulateSuspenseyCommit(
  finishedWork: Fiber,
  committedLanes: Lanes,
  suspendedState: SuspendedState,
): void {
  resetAppearingViewTransitions();
  accumulateSuspenseyCommitOnFiber(
    finishedWork,
    committedLanes,
    suspendedState,
  );
}

function recursivelyAccumulateSuspenseyCommit(
  parentFiber: Fiber,
  committedLanes: Lanes,
  suspendedState: SuspendedState,
): void {
  if (parentFiber.subtreeFlags & suspenseyCommitFlag) {
    let child = parentFiber.child;
    while (child !== null) {
      accumulateSuspenseyCommitOnFiber(child, committedLanes, suspendedState);
      child = child.sibling;
    }
  }
}

function accumulateSuspenseyCommitOnFiber(
  fiber: Fiber,
  committedLanes: Lanes,
  suspendedState: SuspendedState,
) {
  switch (fiber.tag) {
    case HostHoistable: {
      recursivelyAccumulateSuspenseyCommit(
        fiber,
        committedLanes,
        suspendedState,
      );
      if (fiber.flags & suspenseyCommitFlag) {
        if (fiber.memoizedState !== null) {
          suspendResource(
            suspendedState,
            // This should always be set by visiting HostRoot first
            currentHoistableRoot as any,
            fiber.memoizedState,
            fiber.memoizedProps,
          );
        } else {
          const instance = fiber.stateNode;
          const type = fiber.type;
          const props = fiber.memoizedProps;
          // TODO: Allow sync lanes to suspend too with an opt-in.
          if (
            includesOnlySuspenseyCommitEligibleLanes(committedLanes) ||
            maySuspendCommitInSyncRender(type, props)
          ) {
            suspendInstance(suspendedState, instance, type, props);
          }
        }
      }
      break;
    }
    case HostComponent: {
      recursivelyAccumulateSuspenseyCommit(
        fiber,
        committedLanes,
        suspendedState,
      );
      if (fiber.flags & suspenseyCommitFlag) {
        const instance = fiber.stateNode;
        const type = fiber.type;
        const props = fiber.memoizedProps;
        // TODO: Allow sync lanes to suspend too with an opt-in.
        if (
          includesOnlySuspenseyCommitEligibleLanes(committedLanes) ||
          maySuspendCommitInSyncRender(type, props)
        ) {
          suspendInstance(suspendedState, instance, type, props);
        }
      }
      break;
    }
    case HostRoot:
    case HostPortal: {
      // $FlowFixMe[constant-condition]
      if (supportsResources) {
        const previousHoistableRoot = currentHoistableRoot;
        const container: Container = fiber.stateNode.containerInfo;
        currentHoistableRoot = getHoistableRoot(container);

        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState,
        );
        currentHoistableRoot = previousHoistableRoot;
      } else {
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState,
        );
      }
      break;
    }
    case OffscreenComponent: {
      const isHidden = (fiber.memoizedState as OffscreenState | null) !== null;
      if (isHidden) {
        // Don't suspend in hidden trees
      } else {
        const current = fiber.alternate;
        const wasHidden =
          current !== null &&
          (current.memoizedState as OffscreenState | null) !== null;
        if (wasHidden) {
          // This tree is being revealed. Visit all newly visible suspensey
          // instances, even if they're in the current tree.
          const prevFlags = suspenseyCommitFlag;
          suspenseyCommitFlag = MaySuspendCommit;
          recursivelyAccumulateSuspenseyCommit(
            fiber,
            committedLanes,
            suspendedState,
          );
          suspenseyCommitFlag = prevFlags;
        } else {
          recursivelyAccumulateSuspenseyCommit(
            fiber,
            committedLanes,
            suspendedState,
          );
        }
      }
      break;
    }
    case ViewTransitionComponent: {
      if (enableViewTransition) {
        if ((fiber.flags & suspenseyCommitFlag) !== NoFlags) {
          const props: ViewTransitionProps = fiber.memoizedProps;
          const name: ?string | 'auto' = props.name;
          if (name != null && name !== 'auto') {
            // This is a named ViewTransition being mounted or reappearing. Let's add it to
            // the map so we can match it with deletions later.
            const state: ViewTransitionState = fiber.stateNode;
            // Reset the pair in case we didn't end up restoring the instance in previous commits.
            // This shouldn't really happen anymore but just in case. We could maybe add an invariant.
            state.paired = null;
            trackAppearingViewTransition(name, state);
          }
        }
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState,
        );
        break;
      }
      // Fallthrough
    }
    default: {
      recursivelyAccumulateSuspenseyCommit(
        fiber,
        committedLanes,
        suspendedState,
      );
    }
  }
}

// 清空fiber树上child sibling的节点引用
function detachAlternateSiblings(parentFiber: Fiber) {
  // A fiber was deleted from this parent fiber, but it's still part of the
  // previous (alternate) parent fiber's list of children. Because children
  // are a linked list, an earlier sibling that's still alive will be
  // connected to the deleted fiber via its `alternate`:
  //
  //   live fiber --alternate--> previous live fiber --sibling--> deleted
  //   fiber
  //
  // We can't disconnect `alternate` on nodes that haven't been deleted yet,
  // but we can disconnect the `sibling` and `child` pointers.
  // 获取双缓存节点
  const previousFiber = parentFiber.alternate;
  if (previousFiber !== null) {
    // 获取子节点
    let detachedChild = previousFiber.child;
    if (detachedChild !== null) {
      // 清空子节点引用
      previousFiber.child = null;
      do {
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        const detachedSibling = detachedChild.sibling;
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        detachedChild.sibling = null;
        detachedChild = detachedSibling;
      } while (detachedChild !== null);
    }
  }
}


// 主要针对passive的节点、
// 深度遍历执行effect的清理工作
// 执行passive的hook清理
// 执行fiber对象的清理
// 执行fiber树节点的解绑
function recursivelyTraversePassiveUnmountEffects(parentFiber: Fiber): void {
  // Deletions effects can be scheduled on any fiber type. They need to happen
  // before the children effects have fired.
  // 获取本次删除的节点
  const deletions = parentFiber.deletions;

  // 如果该节点有要删除的子树
  if ((parentFiber.flags & ChildDeletion) !== NoFlags) {
    if (deletions !== null) {
      for (let i = 0; i < deletions.length; i++) {
        // 获取单个删除子节点
        const childToDelete = deletions[i];
        // 性能追踪
        const prevEffectStart = pushComponentEffectStart();
        // TODO: Convert this to use recursion
        // 标记要处理的节点
        nextEffect = childToDelete;
        // 遍历所有节点执行passive的hook清理和对象属性清理
        commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
          childToDelete,
          parentFiber,
        );
        // 性能追踪
        if (
          enableProfilerTimer &&
          enableProfilerCommitHooks &&
          enableComponentPerformanceTrack &&
          (childToDelete.mode & ProfileMode) !== NoMode &&
          componentEffectStartTime >= 0 &&
          componentEffectEndTime >= 0 &&
          componentEffectEndTime - componentEffectStartTime > 0.05
        ) {
          logComponentUnmount(
            childToDelete,
            componentEffectStartTime,
            componentEffectEndTime,
          );
        }
        // 性能追踪
        popComponentEffectStart(prevEffectStart);
      }
    }
    // 解绑树节点间的引用
    detachAlternateSiblings(parentFiber);
  }

  // TODO: Split PassiveMask into separate masks for mount and unmount?
  // 检查子树有passive标记才继续执行
  if (parentFiber.subtreeFlags & PassiveMask) {
    let child = parentFiber.child;
    while (child !== null) {
      commitPassiveUnmountOnFiber(child);
      child = child.sibling;
    }
  }
}


// 深度遍历执行effect的清理和fiber节点的清理
function commitPassiveUnmountOnFiber(finishedWork: Fiber): void {
  // effect追踪相关
  const prevEffectStart = pushComponentEffectStart();
  const prevEffectDuration = pushComponentEffectDuration();
  const prevEffectErrors = pushComponentEffectErrors();
  const prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();


  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      // 深度遍历执行effect的清理和fiber节点的清理
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      // 如果是passive阶段 执行该阶段相关的effect的清理
      if (finishedWork.flags & Passive) {
        // 执行hook的清理
        commitHookPassiveUnmountEffects(
          finishedWork,
          finishedWork.return,
          HookPassive | HookHasEffect,
        );
      }
      break;
    }
    case HostRoot: {
      const prevProfilerEffectDuration = pushNestedEffectDurations();
      // 深度遍历执行effect的清理和fiber节点的清理
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      if (enableProfilerTimer && enableProfilerCommitHooks) {
        const finishedRoot: FiberRoot = finishedWork.stateNode;
        finishedRoot.passiveEffectDuration += popNestedEffectDurations(
          prevProfilerEffectDuration,
        );
      }
      break;
    }
    case Profiler: {
      const prevProfilerEffectDuration = pushNestedEffectDurations();
      // 深度遍历执行effect的清理和fiber节点的清理
      recursivelyTraversePassiveUnmountEffects(finishedWork);

      if (enableProfilerTimer && enableProfilerCommitHooks) {
        const profilerInstance = finishedWork.stateNode;
        // Propagate layout effect durations to the next nearest Profiler ancestor.
        // Do not reset these values until the next render so DevTools has a chance to read them first.
        profilerInstance.passiveEffectDuration += bubbleNestedEffectDurations(
          prevProfilerEffectDuration,
        );
      }
      break;
    }
    case OffscreenComponent: {
      const instance: OffscreenInstance = finishedWork.stateNode;
      const nextState: OffscreenState | null = finishedWork.memoizedState;

      const isHidden = nextState !== null;

      if (
        isHidden &&
        instance._visibility & OffscreenPassiveEffectsConnected &&
        // For backwards compatibility, don't unmount when a tree suspends. In
        // the future we may change this to unmount after a delay.
        (finishedWork.return === null ||
          finishedWork.return.tag !== SuspenseComponent)
      ) {
        // The effects are currently connected. Disconnect them.
        // TODO: Add option or heuristic to delay before disconnecting the
        // effects. Then if the tree reappears before the delay has elapsed, we
        // can skip toggling the effects entirely.
        instance._visibility &= ~OffscreenPassiveEffectsConnected;
        // 对nextEffect上保存的fiber节点执行passive阶段的hook'清理和fibe对象属性的清理
        recursivelyTraverseDisconnectPassiveEffects(finishedWork);

        if (
          enableProfilerTimer &&
          enableProfilerCommitHooks &&
          enableComponentPerformanceTrack &&
          (finishedWork.mode & ProfileMode) !== NoMode &&
          componentEffectStartTime >= 0 &&
          componentEffectEndTime >= 0 &&
          componentEffectEndTime - componentEffectStartTime > 0.05
        ) {
          logComponentDisappeared(
            finishedWork,
            componentEffectStartTime,
            componentEffectEndTime,
          );
        }
      } else {
      // 深度遍历执行effect的清理和fiber节点的清理
        recursivelyTraversePassiveUnmountEffects(finishedWork);
      }

      break;
    }
    default: {
      // 深度遍历执行effect的清理和fiber节点的清理
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      break;
    }
  }

  if (
    enableProfilerTimer &&
    enableProfilerCommitHooks &&
    enableComponentPerformanceTrack &&
    (finishedWork.mode & ProfileMode) !== NoMode &&
    componentEffectStartTime >= 0 &&
    componentEffectEndTime >= 0 &&
    (componentEffectSpawnedUpdate || componentEffectDuration > 0.05)
  ) {
    logComponentEffect(
      finishedWork,
      componentEffectStartTime,
      componentEffectEndTime,
      componentEffectDuration,
      componentEffectErrors,
    );
  }

  popComponentEffectStart(prevEffectStart);
  popComponentEffectDuration(prevEffectDuration);
  popComponentEffectDidSpawnUpdate(prevEffectDidSpawnUpdate);
  popComponentEffectErrors(prevEffectErrors);
}


// 对于不显示的节点的清理
// 这个目前不检查passive
// 对nextEffect上保存的fiber节点执行passive阶段的hook'清理和fibe对象属性的清理
function recursivelyTraverseDisconnectPassiveEffects(parentFiber: Fiber): void {
  // Deletions effects can be scheduled on any fiber type. They need to happen
  // before the children effects have fired.
  const deletions = parentFiber.deletions;

  if ((parentFiber.flags & ChildDeletion) !== NoFlags) {
    if (deletions !== null) {
      for (let i = 0; i < deletions.length; i++) {
        const childToDelete = deletions[i];
        const prevEffectStart = pushComponentEffectStart();

        // TODO: Convert this to use recursion
        nextEffect = childToDelete;
        // 对nextEffect上保存的fiber节点执行passive阶段的hook'清理和fibe对象属性的清理
        commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
          childToDelete,
          parentFiber,
        );

        if (
          enableProfilerTimer &&
          enableProfilerCommitHooks &&
          enableComponentPerformanceTrack &&
          (childToDelete.mode & ProfileMode) !== NoMode &&
          componentEffectStartTime >= 0 &&
          componentEffectEndTime >= 0 &&
          componentEffectEndTime - componentEffectStartTime > 0.05
        ) {
          // While this is inside the disconnect path. This is a deletion within the
          // disconnected tree. We currently log this for deletions in the mutation
          // phase since it's shared by the disappear path.
          logComponentUnmount(
            childToDelete,
            componentEffectStartTime,
            componentEffectEndTime,
          );
        }
        popComponentEffectStart(prevEffectStart);
      }
    }
    // 解绑节点
    detachAlternateSiblings(parentFiber);
  }

  // TODO: Check PassiveStatic flag
  let child = parentFiber.child;
  while (child !== null) {
    disconnectPassiveEffect(child);
    child = child.sibling;
  }
}

export function disconnectPassiveEffect(finishedWork: Fiber): void {
  const prevEffectStart = pushComponentEffectStart();
  const prevEffectDuration = pushComponentEffectDuration();
  const prevEffectErrors = pushComponentEffectErrors();
  const prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();

  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      // TODO: Check PassiveStatic flag
      commitHookPassiveUnmountEffects(
        finishedWork,
        finishedWork.return,
        HookPassive,
      );
      // When disconnecting passive effects, we fire the effects in the same
      // order as during a deletiong: parent before child
      recursivelyTraverseDisconnectPassiveEffects(finishedWork);
      break;
    }
    case OffscreenComponent: {
      const instance: OffscreenInstance = finishedWork.stateNode;
      if (instance._visibility & OffscreenPassiveEffectsConnected) {
        instance._visibility &= ~OffscreenPassiveEffectsConnected;
        recursivelyTraverseDisconnectPassiveEffects(finishedWork);
      } else {
        // The effects are already disconnected.
      }
      break;
    }
    default: {
      recursivelyTraverseDisconnectPassiveEffects(finishedWork);
      break;
    }
  }

  if (
    enableProfilerTimer &&
    enableProfilerCommitHooks &&
    enableComponentPerformanceTrack &&
    (finishedWork.mode & ProfileMode) !== NoMode &&
    componentEffectStartTime >= 0 &&
    componentEffectEndTime >= 0 &&
    (componentEffectSpawnedUpdate || componentEffectDuration > 0.05)
  ) {
    logComponentEffect(
      finishedWork,
      componentEffectStartTime,
      componentEffectEndTime,
      componentEffectDuration,
      componentEffectErrors,
    );
  }

  popComponentEffectStart(prevEffectStart);
  popComponentEffectDuration(prevEffectDuration);
  popComponentEffectDidSpawnUpdate(prevEffectDidSpawnUpdate);
  popComponentEffectErrors(prevEffectErrors);
}


// 对nextEffect上保存的fiber节点执行passive阶段的hook'清理和fibe对象属性的清理
// 从父节点遍历到子节点
function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
  deletedSubtreeRoot: Fiber,
  nearestMountedAncestor: Fiber | null,
) {
  // 在第一次执行的时候nextEffect和deletedSubtreeRoot应该是同一个节点
  // 这里是深度遍历子节点
  while (nextEffect !== null) {
    const fiber = nextEffect;

    // Deletion effects fire in parent -> child order
    // TODO: Check if fiber has a PassiveStatic flag
    // 清理passive的hook
    commitPassiveUnmountInsideDeletedTreeOnFiber(fiber, nearestMountedAncestor);

    const child = fiber.child;
    // TODO: Only traverse subtree if it has a PassiveStatic flag.
    // 这里可以看到只会一直遍历到子节点，执行子节点上passive相关的effect清理
    if (child !== null) {
      child.return = fiber;
      nextEffect = child;
    } else {
      // 从子节点遍历回到父节点 执行对象的清理工作
      commitPassiveUnmountEffectsInsideOfDeletedTree_complete(
        deletedSubtreeRoot,
      );
    }
  }
}

// 遍历到子节点为空的时候就会进入到这个逻辑
// 从子节点又遍历回到父节点
function commitPassiveUnmountEffectsInsideOfDeletedTree_complete(
  deletedSubtreeRoot: Fiber,
) {
  while (nextEffect !== null) {
    // 当前节点
    const fiber = nextEffect;
    // 兄弟节点
    const sibling = fiber.sibling;
    // 父节点
    const returnFiber = fiber.return;

    // Recursively traverse the entire deleted tree and clean up fiber fields.
    // This is more aggressive than ideal, and the long term goal is to only
    // have to detach the deleted tree at the root.
    // 清理fiber节点的属性对象
    detachFiberAfterEffects(fiber);
    // 遍历回到父节点后，说明遍历完成  
    if (fiber === deletedSubtreeRoot) {
      nextEffect = null;
      return;
    }

    if (sibling !== null) {
      // 重置父节点
      sibling.return = returnFiber;
      // 切换节点到兄弟节点
      nextEffect = sibling;
      return;
    }
    // 这里又从子节点遍历回到父节点了
    nextEffect = returnFiber;
  }
}


// 主要就是执行一些性能追踪相关的内容
// 对于常规函数组件主要执行passive节点的hook的清理
function commitPassiveUnmountInsideDeletedTreeOnFiber(
  current: Fiber,
  nearestMountedAncestor: Fiber | null,
): void {
  const prevEffectStart = pushComponentEffectStart();
  const prevEffectDuration = pushComponentEffectDuration();
  const prevEffectErrors = pushComponentEffectErrors();
  const prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();
  switch (current.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      // 执行passive相关的effect的清理工作
      commitHookPassiveUnmountEffects(
        current,
        nearestMountedAncestor,
        HookPassive,
      );
      break;
    }
    // TODO: run passive unmount effects when unmounting a root.
    // Because passive unmount effects are not currently run,
    // the cache instance owned by the root will never be freed.
    // When effects are run, the cache should be freed here:
    // case HostRoot: {
    //   const cache = current.memoizedState.cache;
    //   releaseCache(cache);
    //   break;
    // }
    case LegacyHiddenComponent:
    case OffscreenComponent: {
      if (
        current.memoizedState !== null &&
        current.memoizedState.cachePool !== null
      ) {
        const cache: Cache = current.memoizedState.cachePool.pool;
        // Retain/release the cache used for pending (suspended) nodes.
        // Note that this is only reached in the non-suspended/visible case:
        // when the content is suspended/hidden, the retain/release occurs
        // via the parent Suspense component (see case above).
        if (cache != null) {
          // 缓存计数加1
          retainCache(cache);
        }
      }
      break;
    }
    case SuspenseComponent: {
      if (enableTransitionTracing) {
        // We need to mark this fiber's parents as deleted
        const offscreenFiber: Fiber = current.child as any;
        const instance: OffscreenInstance = offscreenFiber.stateNode;
        const transitions = instance._transitions;
        if (transitions !== null) {
          const abortReason: TransitionAbort = {
            reason: 'suspense',
            name: current.memoizedProps.name || null,
          };
          if (
            current.memoizedState === null ||
            current.memoizedState.dehydrated === null
          ) {
            abortParentMarkerTransitionsForDeletedFiber(
              offscreenFiber,
              abortReason,
              transitions,
              instance,
              true,
            );

            if (nearestMountedAncestor !== null) {
              abortParentMarkerTransitionsForDeletedFiber(
                nearestMountedAncestor,
                abortReason,
                transitions,
                instance,
                false,
              );
            }
          }
        }
      }
      break;
    }
    case CacheComponent: {
      const cache = current.memoizedState.cache;
      // 释放缓存
      releaseCache(cache);
      break;
    }
    case TracingMarkerComponent: {
      if (enableTransitionTracing) {
        // We need to mark this fiber's parents as deleted
        const instance: TracingMarkerInstance = current.stateNode;
        const transitions = instance.transitions;
        if (transitions !== null) {
          const abortReason: TransitionAbort = {
            reason: 'marker',
            name: current.memoizedProps.name,
          };
          abortParentMarkerTransitionsForDeletedFiber(
            current,
            abortReason,
            transitions,
            null,
            true,
          );

          if (nearestMountedAncestor !== null) {
            abortParentMarkerTransitionsForDeletedFiber(
              nearestMountedAncestor,
              abortReason,
              transitions,
              null,
              false,
            );
          }
        }
      }
      break;
    }
  }

  if (
    enableProfilerTimer &&
    enableProfilerCommitHooks &&
    enableComponentPerformanceTrack &&
    (current.mode & ProfileMode) !== NoMode &&
    componentEffectStartTime >= 0 &&
    componentEffectEndTime >= 0 &&
    (componentEffectSpawnedUpdate || componentEffectDuration > 0.05)
  ) {
    logComponentEffect(
      current,
      componentEffectStartTime,
      componentEffectEndTime,
      componentEffectDuration,
      componentEffectErrors,
    );
  }

  popComponentEffectStart(prevEffectStart);
  popComponentEffectDuration(prevEffectDuration);
  popComponentEffectDidSpawnUpdate(prevEffectDidSpawnUpdate);
  popComponentEffectErrors(prevEffectErrors);
}

export function invokeLayoutEffectMountInDEV(fiber: Fiber): void {
  if (__DEV__) {
    // We don't need to re-check StrictEffectsMode here.
    // This function is only called if that check has already passed.
    switch (fiber.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent: {
        commitHookEffectListMount(HookLayout | HookHasEffect, fiber);
        break;
      }
      case ClassComponent: {
        commitClassDidMount(fiber);
        break;
      }
    }
  }
}

export function invokePassiveEffectMountInDEV(fiber: Fiber): void {
  if (__DEV__) {
    // We don't need to re-check StrictEffectsMode here.
    // This function is only called if that check has already passed.
    switch (fiber.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent: {
        commitHookEffectListMount(HookPassive | HookHasEffect, fiber);
        break;
      }
    }
  }
}

export function invokeLayoutEffectUnmountInDEV(fiber: Fiber): void {
  if (__DEV__) {
    // We don't need to re-check StrictEffectsMode here.
    // This function is only called if that check has already passed.
    switch (fiber.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent: {
        commitHookEffectListUnmount(
          HookLayout | HookHasEffect,
          fiber,
          fiber.return,
        );
        break;
      }
      case ClassComponent: {
        const instance = fiber.stateNode;
        if (typeof instance.componentWillUnmount === 'function') {
          safelyCallComponentWillUnmount(fiber, fiber.return, instance);
        }
        break;
      }
    }
  }
}

export function invokePassiveEffectUnmountInDEV(fiber: Fiber): void {
  if (__DEV__) {
    // We don't need to re-check StrictEffectsMode here.
    // This function is only called if that check has already passed.
    switch (fiber.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent: {
        commitHookEffectListUnmount(
          HookPassive | HookHasEffect,
          fiber,
          fiber.return,
        );
      }
    }
  }
}
