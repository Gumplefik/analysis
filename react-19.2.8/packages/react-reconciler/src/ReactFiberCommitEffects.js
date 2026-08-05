/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  ViewTransitionProps,
  ProfilerProps,
  ProfilerPhase,
} from 'shared/ReactTypes';
import type {Fiber} from './ReactInternalTypes';
import type {UpdateQueue} from './ReactFiberClassUpdateQueue';
import type {FunctionComponentUpdateQueue} from './ReactFiberHooks';
import type {HookFlags} from './ReactHookEffectTags';
import type {FragmentInstanceType} from './ReactFiberConfig';
import type {ViewTransitionState} from './ReactFiberViewTransitionComponent';

import {getViewTransitionName} from './ReactFiberViewTransitionComponent';

import {
  enableProfilerTimer,
  enableProfilerCommitHooks,
  enableProfilerNestedUpdatePhase,
  enableSchedulingProfiler,
  enableViewTransition,
  enableFragmentRefs,
} from 'shared/ReactFeatureFlags';
import {
  ClassComponent,
  Fragment,
  HostComponent,
  HostHoistable,
  HostSingleton,
  ViewTransitionComponent,
} from './ReactWorkTags';
import {NoFlags} from './ReactFiberFlags';
import getComponentNameFromFiber from 'react-reconciler/src/getComponentNameFromFiber';
import {resolveClassComponentProps} from './ReactFiberClassComponent';
import {
  recordEffectDuration,
  startEffectTimer,
  isCurrentUpdateNested,
} from './ReactProfilerTimer';
import {NoMode, ProfileMode} from './ReactTypeOfMode';
import {
  commitCallbacks,
  commitHiddenCallbacks,
} from './ReactFiberClassUpdateQueue';
import {
  getPublicInstance,
  createViewTransitionInstance,
  createFragmentInstance,
} from './ReactFiberConfig';
import {
  captureCommitPhaseError,
  setIsRunningInsertionEffect,
} from './ReactFiberWorkLoop';
import {
  NoFlags as NoHookEffect,
  Layout as HookLayout,
  Insertion as HookInsertion,
  Passive as HookPassive,
} from './ReactHookEffectTags';
import {didWarnAboutReassigningProps} from './ReactFiberBeginWork';
import {
  markComponentPassiveEffectMountStarted,
  markComponentPassiveEffectMountStopped,
  markComponentPassiveEffectUnmountStarted,
  markComponentPassiveEffectUnmountStopped,
  markComponentLayoutEffectMountStarted,
  markComponentLayoutEffectMountStopped,
  markComponentLayoutEffectUnmountStarted,
  markComponentLayoutEffectUnmountStopped,
} from './ReactFiberDevToolsHook';
import {
  callComponentDidMountInDEV,
  callComponentDidUpdateInDEV,
  callComponentWillUnmountInDEV,
  callCreateInDEV,
  callDestroyInDEV,
} from './ReactFiberCallUserSpace';

import {runWithFiberInDEV} from './ReactCurrentFiber';

function shouldProfile(current: Fiber): boolean {
  return (
    enableProfilerTimer &&
    enableProfilerCommitHooks &&
    (current.mode & ProfileMode) !== NoMode
  );
}

// 实际调用commitHookEffectListMount
// 主要是执行effect函数，保存清理回调
// 根据hookFlags的标记，执行对应阶段的effect
export function commitHookLayoutEffects(
  finishedWork: Fiber,
  hookFlags: HookFlags,
) {
  // At this point layout effects have already been destroyed (during mutation phase).
  // This is done to prevent sibling component effects from interfering with each other,
  // e.g. a destroy function in one component should never override a ref set
  // by a create function in another component during the same commit.
  if (shouldProfile(finishedWork)) {
    startEffectTimer();
    commitHookEffectListMount(hookFlags, finishedWork);
    recordEffectDuration(finishedWork);
  } else {
    commitHookEffectListMount(hookFlags, finishedWork);
  }
}

// 带有profile的effect清理，实际调用还是 commitHookEffectListUnmount
export function commitHookLayoutUnmountEffects(
  finishedWork: Fiber,
  nearestMountedAncestor: null | Fiber,
  hookFlags: HookFlags,
) {
  // Layout effects are destroyed during the mutation phase so that all
  // destroy functions for all fibers are called before any create functions.
  // This prevents sibling component effects from interfering with each other,
  // e.g. a destroy function in one component should never override a ref set
  // by a create function in another component during the same commit.
  if (shouldProfile(finishedWork)) {
    startEffectTimer();
    commitHookEffectListUnmount(
      hookFlags,
      finishedWork,
      nearestMountedAncestor,
    );
    recordEffectDuration(finishedWork);
  } else {
    commitHookEffectListUnmount(
      hookFlags,
      finishedWork,
      nearestMountedAncestor,
    );
  }
}


// useInsertionEffect提交执行
// 样式注入相关 按顺序执行effect的初始化以及保存清理回调函数
// 见 https://react.dev/reference/react/useInsertionEffect
export function commitHookEffectListMount(
  flags: HookFlags,
  finishedWork: Fiber,
) {
  try {
    const updateQueue: FunctionComponentUpdateQueue | null =
      finishedWork.updateQueue as any;
    const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
    if (lastEffect !== null) {
      const firstEffect = lastEffect.next;
      let effect = firstEffect;
      do {
        // 如果任务重叠一致
        if ((effect.tag & flags) === flags) {
          // 性能追踪
          if (enableSchedulingProfiler) {
            if ((flags & HookPassive) !== NoHookEffect) {
              markComponentPassiveEffectMountStarted(finishedWork);
            } else if ((flags & HookLayout) !== NoHookEffect) {
              markComponentLayoutEffectMountStarted(finishedWork);
            }
          }

          // Mount
          let destroy;
          // 开发逻辑略过
          if (__DEV__) {
            if ((flags & HookInsertion) !== NoHookEffect) {
              setIsRunningInsertionEffect(true);
            }
            destroy = runWithFiberInDEV(finishedWork, callCreateInDEV, effect);
            if ((flags & HookInsertion) !== NoHookEffect) {
              setIsRunningInsertionEffect(false);
            }
          } else {
            const create = effect.create;
            const inst = effect.inst;
            // 执行create，就是useEffect里传入的函数
            destroy = create();
            // 保存清理函数
            inst.destroy = destroy;
          }
          // 性能追踪相关
          if (enableSchedulingProfiler) {
            if ((flags & HookPassive) !== NoHookEffect) {
              markComponentPassiveEffectMountStopped();
            } else if ((flags & HookLayout) !== NoHookEffect) {
              markComponentLayoutEffectMountStopped();
            }
          }

          if (__DEV__) {
            if (destroy !== undefined && typeof destroy !== 'function') {
              let hookName;
              if ((effect.tag & HookLayout) !== NoFlags) {
                hookName = 'useLayoutEffect';
              } else if ((effect.tag & HookInsertion) !== NoFlags) {
                hookName = 'useInsertionEffect';
              } else {
                hookName = 'useEffect';
              }
              let addendum;
              // $FlowFixMe[invalid-compare]
              if (destroy === null) {
                addendum =
                  ' You returned null. If your effect does not require clean ' +
                  'up, return undefined (or nothing).';
                // $FlowFixMe[incompatible-type] (@poteto) this check is safe on arbitrary non-null/void objects
              } else if (typeof destroy.then === 'function') {
                addendum =
                  '\n\nIt looks like you wrote ' +
                  hookName +
                  '(async () => ...) or returned a Promise. ' +
                  'Instead, write the async function inside your effect ' +
                  'and call it immediately:\n\n' +
                  hookName +
                  '(() => {\n' +
                  '  async function fetchData() {\n' +
                  '    // You can await here\n' +
                  '    const response = await MyAPI.getData(someId);\n' +
                  '    // ...\n' +
                  '  }\n' +
                  '  fetchData();\n' +
                  `}, [someId]); // Or [] if effect doesn't need props or state\n\n` +
                  'Learn more about data fetching with Hooks: https://react.dev/link/hooks-data-fetching';
              } else {
                // $FlowFixMe[unsafe-addition] (@poteto)
                addendum = ' You returned: ' + destroy;
              }
              runWithFiberInDEV(
                finishedWork,
                (n, a) => {
                  console.error(
                    '%s must not return anything besides a function, ' +
                      'which is used for clean-up.%s',
                    n,
                    a,
                  );
                },
                hookName,
                addendum,
              );
            }
          }
        }
        // 继续下一个effect
        effect = effect.next;
        // effect是个环形链表，所有到头的时候就代表之心完了，就要退出
      } while (effect !== firstEffect);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}

// 找到effect更新队列上flags一样的effect，执行destory 
// 执行effect的清理
export function commitHookEffectListUnmount(
  flags: HookFlags,
  finishedWork: Fiber,
  nearestMountedAncestor: Fiber | null,
) {
  try {
    const updateQueue: FunctionComponentUpdateQueue | null =
      finishedWork.updateQueue as any;
    const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
    if (lastEffect !== null) {
      const firstEffect = lastEffect.next;
      let effect = firstEffect;
      do {
        // 这里有个细节，只会执行同个类型的effect
        // 意味着effect也有不同类型，即不同阶段的effect
        if ((effect.tag & flags) === flags) {
          // Unmount
          const inst = effect.inst;
          const destroy = inst.destroy;
          if (destroy !== undefined) {
            inst.destroy = undefined;
            if (enableSchedulingProfiler) {
              if ((flags & HookPassive) !== NoHookEffect) {
                markComponentPassiveEffectUnmountStarted(finishedWork);
              } else if ((flags & HookLayout) !== NoHookEffect) {
                markComponentLayoutEffectUnmountStarted(finishedWork);
              }
            }

            if (__DEV__) {
              if ((flags & HookInsertion) !== NoHookEffect) {
                setIsRunningInsertionEffect(true);
              }
            }
            safelyCallDestroy(finishedWork, nearestMountedAncestor, destroy);
            if (__DEV__) {
              if ((flags & HookInsertion) !== NoHookEffect) {
                setIsRunningInsertionEffect(false);
              }
            }

            if (enableSchedulingProfiler) {
              if ((flags & HookPassive) !== NoHookEffect) {
                markComponentPassiveEffectUnmountStopped();
              } else if ((flags & HookLayout) !== NoHookEffect) {
                markComponentLayoutEffectUnmountStopped();
              }
            }
          }
        }
        effect = effect.next;
      } while (effect !== firstEffect);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}

// 提交指定阶段的effect执行
export function commitHookPassiveMountEffects(
  finishedWork: Fiber,
  hookFlags: HookFlags,
) {
  if (shouldProfile(finishedWork)) {
    startEffectTimer();
    commitHookEffectListMount(hookFlags, finishedWork);
    recordEffectDuration(finishedWork);
  } else {
    commitHookEffectListMount(hookFlags, finishedWork);
  }
}


// 带有profile的执行指定循环相关的effect
export function commitHookPassiveUnmountEffects(
  finishedWork: Fiber,
  nearestMountedAncestor: null | Fiber,
  hookFlags: HookFlags,
) {
  if (shouldProfile(finishedWork)) {
    startEffectTimer();
    commitHookEffectListUnmount(
      hookFlags,
      finishedWork,
      nearestMountedAncestor,
    );
    recordEffectDuration(finishedWork);
  } else {
    commitHookEffectListUnmount(
      hookFlags,
      finishedWork,
      nearestMountedAncestor,
    );
  }
}

// 执行componentDidMount函数钩子 或者 componentDidUpdate钩子
export function commitClassLayoutLifecycles(
  finishedWork: Fiber,
  // 双缓存fiber
  current: Fiber | null,
) {
  const instance = finishedWork.stateNode;
  // 双缓存节点没有的话意味是初始化阶段  所以走的是componentDidMount函数
  if (current === null) {
    // We could update instance props and state here,
    // but instead we rely on them being set during last render.
    // TODO: revisit this when we implement resuming.
    if (__DEV__) {
      if (
        !finishedWork.type.defaultProps &&
        !('ref' in finishedWork.memoizedProps) &&
        !didWarnAboutReassigningProps
      ) {
        if (instance.props !== finishedWork.memoizedProps) {
          console.error(
            'Expected %s props to match memoized props before ' +
              'componentDidMount. ' +
              'This might either be because of a bug in React, or because ' +
              'a component reassigns its own `this.props`. ' +
              'Please file an issue.',
            getComponentNameFromFiber(finishedWork) || 'instance',
          );
        }
        if (instance.state !== finishedWork.memoizedState) {
          console.error(
            'Expected %s state to match memoized state before ' +
              'componentDidMount. ' +
              'This might either be because of a bug in React, or because ' +
              'a component reassigns its own `this.state`. ' +
              'Please file an issue.',
            getComponentNameFromFiber(finishedWork) || 'instance',
          );
        }
      }
    }
    if (shouldProfile(finishedWork)) {
      startEffectTimer();
      if (__DEV__) {
        runWithFiberInDEV(
          finishedWork,
          callComponentDidMountInDEV,
          finishedWork,
          instance,
        );
      } else {
        try {
          instance.componentDidMount();
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
      recordEffectDuration(finishedWork);
    } else {
      if (__DEV__) {
        runWithFiberInDEV(
          finishedWork,
          callComponentDidMountInDEV,
          finishedWork,
          instance,
        );
      } else {
        try {
          instance.componentDidMount();
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
    }
  } else {
    const prevProps = resolveClassComponentProps(
      finishedWork.type,
      current.memoizedProps,
    );
    const prevState = current.memoizedState;
    // We could update instance props and state here,
    // but instead we rely on them being set during last render.
    // TODO: revisit this when we implement resuming.
    if (__DEV__) {
      if (
        !finishedWork.type.defaultProps &&
        !('ref' in finishedWork.memoizedProps) &&
        !didWarnAboutReassigningProps
      ) {
        if (instance.props !== finishedWork.memoizedProps) {
          console.error(
            'Expected %s props to match memoized props before ' +
              'componentDidUpdate. ' +
              'This might either be because of a bug in React, or because ' +
              'a component reassigns its own `this.props`. ' +
              'Please file an issue.',
            getComponentNameFromFiber(finishedWork) || 'instance',
          );
        }
        if (instance.state !== finishedWork.memoizedState) {
          console.error(
            'Expected %s state to match memoized state before ' +
              'componentDidUpdate. ' +
              'This might either be because of a bug in React, or because ' +
              'a component reassigns its own `this.state`. ' +
              'Please file an issue.',
            getComponentNameFromFiber(finishedWork) || 'instance',
          );
        }
      }
    }
    if (shouldProfile(finishedWork)) {
      startEffectTimer();
      if (__DEV__) {
        runWithFiberInDEV(
          finishedWork,
          callComponentDidUpdateInDEV,
          finishedWork,
          instance,
          prevProps,
          prevState,
          instance.__reactInternalSnapshotBeforeUpdate,
        );
      } else {
        try {
          instance.componentDidUpdate(
            prevProps,
            prevState,
            instance.__reactInternalSnapshotBeforeUpdate,
          );
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
      recordEffectDuration(finishedWork);
    } else {
      if (__DEV__) {
        runWithFiberInDEV(
          finishedWork,
          callComponentDidUpdateInDEV,
          finishedWork,
          instance,
          prevProps,
          prevState,
          instance.__reactInternalSnapshotBeforeUpdate,
        );
      } else {
        try {
          instance.componentDidUpdate(
            prevProps,
            prevState,
            // getSnapshotBeforeUpdate()返回的值 
            instance.__reactInternalSnapshotBeforeUpdate,
          );
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
    }
  }
}

export function commitClassDidMount(finishedWork: Fiber) {
  // TODO: Check for LayoutStatic flag
  const instance = finishedWork.stateNode;
  if (typeof instance.componentDidMount === 'function') {
    if (__DEV__) {
      runWithFiberInDEV(
        finishedWork,
        callComponentDidMountInDEV,
        finishedWork,
        instance,
      );
    } else {
      try {
        instance.componentDidMount();
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
  }
}

// 执行setState回调函数
export function commitClassCallbacks(finishedWork: Fiber) {
  // TODO: I think this is now always non-null by the time it reaches the
  // commit phase. Consider removing the type check.
  // 获取一些state相关的信息和回调函数
  const updateQueue: UpdateQueue<mixed> | null =
    finishedWork.updateQueue as any;
  if (updateQueue !== null) {
    // 获取dom实例
    const instance = finishedWork.stateNode;
    if (__DEV__) {
      if (
        !finishedWork.type.defaultProps &&
        !('ref' in finishedWork.memoizedProps) &&
        !didWarnAboutReassigningProps
      ) {
        if (instance.props !== finishedWork.memoizedProps) {
          console.error(
            'Expected %s props to match memoized props before ' +
              'processing the update queue. ' +
              'This might either be because of a bug in React, or because ' +
              'a component reassigns its own `this.props`. ' +
              'Please file an issue.',
            getComponentNameFromFiber(finishedWork) || 'instance',
          );
        }
        if (instance.state !== finishedWork.memoizedState) {
          console.error(
            'Expected %s state to match memoized state before ' +
              'processing the update queue. ' +
              'This might either be because of a bug in React, or because ' +
              'a component reassigns its own `this.state`. ' +
              'Please file an issue.',
            getComponentNameFromFiber(finishedWork) || 'instance',
          );
        }
      }
    }
    // We could update instance props and state here,
    // but instead we rely on them being set during last render.
    // TODO: revisit this when we implement resuming.
    try {
      if (__DEV__) {
        runWithFiberInDEV(finishedWork, commitCallbacks, updateQueue, instance);
      } else {
        commitCallbacks(updateQueue, instance);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
}

export function commitClassHiddenCallbacks(finishedWork: Fiber) {
  // Commit any callbacks that would have fired while the component
  // was hidden.
  const updateQueue: UpdateQueue<mixed> | null =
    finishedWork.updateQueue as any;
  if (updateQueue !== null) {
    const instance = finishedWork.stateNode;
    try {
      if (__DEV__) {
        runWithFiberInDEV(
          finishedWork,
          commitHiddenCallbacks,
          updateQueue,
          instance,
        );
      } else {
        commitHiddenCallbacks(updateQueue, instance);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
}


// 在根节点上提交setState的回调函数执行
// 主要是多了instance的获取的特殊处理
export function commitRootCallbacks(finishedWork: Fiber) {
  // TODO: I think this is now always non-null by the time it reaches the
  // commit phase. Consider removing the type check.
  const updateQueue: UpdateQueue<mixed> | null =
    finishedWork.updateQueue as any;
  if (updateQueue !== null) {
    // 获取react实例
    let instance = null;
    if (finishedWork.child !== null) {
      switch (finishedWork.child.tag) {
        case HostSingleton:
        case HostComponent:
          instance = getPublicInstance(finishedWork.child.stateNode);
          break;
        case ClassComponent:
          instance = finishedWork.child.stateNode;
          break;
      }
    }
    try {
      if (__DEV__) {
        runWithFiberInDEV(finishedWork, commitCallbacks, updateQueue, instance);
      } else {
        // 执行回调函数
        commitCallbacks(updateQueue, instance);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
}

let didWarnAboutUndefinedSnapshotBeforeUpdate: Set<mixed> | null = null;
if (__DEV__) {
  didWarnAboutUndefinedSnapshotBeforeUpdate = new Set();
}

function callGetSnapshotBeforeUpdates(
  instance: any,
  prevProps: any,
  prevState: any,
) {
  return instance.getSnapshotBeforeUpdate(prevProps, prevState);
}

export function commitClassSnapshot(finishedWork: Fiber, current: Fiber) {
  const prevProps = current.memoizedProps;
  const prevState = current.memoizedState;
  const instance = finishedWork.stateNode;
  // We could update instance props and state here,
  // but instead we rely on them being set during last render.
  // TODO: revisit this when we implement resuming.
  if (__DEV__) {
    if (
      !finishedWork.type.defaultProps &&
      !('ref' in finishedWork.memoizedProps) &&
      !didWarnAboutReassigningProps
    ) {
      if (instance.props !== finishedWork.memoizedProps) {
        console.error(
          'Expected %s props to match memoized props before ' +
            'getSnapshotBeforeUpdate. ' +
            'This might either be because of a bug in React, or because ' +
            'a component reassigns its own `this.props`. ' +
            'Please file an issue.',
          getComponentNameFromFiber(finishedWork) || 'instance',
        );
      }
      if (instance.state !== finishedWork.memoizedState) {
        console.error(
          'Expected %s state to match memoized state before ' +
            'getSnapshotBeforeUpdate. ' +
            'This might either be because of a bug in React, or because ' +
            'a component reassigns its own `this.state`. ' +
            'Please file an issue.',
          getComponentNameFromFiber(finishedWork) || 'instance',
        );
      }
    }
  }
  try {
    const resolvedPrevProps = resolveClassComponentProps(
      finishedWork.type,
      prevProps,
    );
    let snapshot;
    if (__DEV__) {
      snapshot = runWithFiberInDEV(
        finishedWork,
        callGetSnapshotBeforeUpdates,
        instance,
        resolvedPrevProps,
        prevState,
      );
      const didWarnSet =
        didWarnAboutUndefinedSnapshotBeforeUpdate as any as Set<mixed>;
      if (snapshot === undefined && !didWarnSet.has(finishedWork.type)) {
        didWarnSet.add(finishedWork.type);
        runWithFiberInDEV(finishedWork, () => {
          console.error(
            '%s.getSnapshotBeforeUpdate(): A snapshot value (or null) ' +
              'must be returned. You have returned undefined.',
            getComponentNameFromFiber(finishedWork),
          );
        });
      }
    } else {
      snapshot = callGetSnapshotBeforeUpdates(
        instance,
        resolvedPrevProps,
        prevState,
      );
    }
    instance.__reactInternalSnapshotBeforeUpdate = snapshot;
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}

// Capture errors so they don't interrupt unmounting.
export function safelyCallComponentWillUnmount(
  current: Fiber,
  nearestMountedAncestor: Fiber | null,
  instance: any,
) {
  // 清理属性 获取新的props
  instance.props = resolveClassComponentProps(
    current.type,
    current.memoizedProps,
  );
  // copy state
  instance.state = current.memoizedState;
  if (shouldProfile(current)) {
    startEffectTimer();
    if (__DEV__) {
      runWithFiberInDEV(
        current,
        callComponentWillUnmountInDEV,
        current,
        nearestMountedAncestor,
        instance,
      );
    } else {
      try {
        // 执行卸载周期函数
        instance.componentWillUnmount();
      } catch (error) {
        captureCommitPhaseError(current, nearestMountedAncestor, error);
      }
    }
    recordEffectDuration(current);
  } else {
    if (__DEV__) {
      runWithFiberInDEV(
        current,
        callComponentWillUnmountInDEV,
        current,
        nearestMountedAncestor,
        instance,
      );
    } else {
      try {
        // 执行卸载周期函数
        instance.componentWillUnmount();
      } catch (error) {
        captureCommitPhaseError(current, nearestMountedAncestor, error);
      }
    }
  }
}

// 绑定实例到ref上，支持函数ref，返回清理函数
function commitAttachRef(finishedWork: Fiber) {
  // 获取ref
  const ref = finishedWork.ref;
  // 如果有定义ref的话
  if (ref !== null) {
    let instanceToUse;
    // 根据节点类型选择不同的处理方式
    switch (finishedWork.tag) {
      // 对于这三类组件需要特殊处理
      case HostHoistable:
      case HostSingleton:
      case HostComponent:
        // 获取实际应该绑定的dom实例
        instanceToUse = getPublicInstance(finishedWork.stateNode);
        break;
      // 对于过渡组件 如果开启视图过渡的话 实例就切换为过渡对象
      case ViewTransitionComponent: {
        if (enableViewTransition) {
          // 获取dom实例
          const instance: ViewTransitionState = finishedWork.stateNode;
          // 获取props参数
          const props: ViewTransitionProps = finishedWork.memoizedProps;
          // 获取过渡名称
          const name = getViewTransitionName(props, instance);
          if (instance.ref === null || instance.ref.name !== name) {
            // 创建过渡对象，并保存引用
            instance.ref = createViewTransitionInstance(name);
          }
          // 切换实例到过渡对象上
          instanceToUse = instance.ref;
          break;
        }
        // 常规过渡就是dom实例
        instanceToUse = finishedWork.stateNode;
        break;
      }
      // 虚拟组件
      case Fragment:
        // 如果开启了ref
        if (enableFragmentRefs) {
          // 获取fragment实例
          const instance: null | FragmentInstanceType = finishedWork.stateNode;
          if (instance === null) {
            // 初始化实例
            finishedWork.stateNode = createFragmentInstance(finishedWork);
          }
          // 实例就是fragment的实例
          instanceToUse = finishedWork.stateNode;
          break;
        }
      // Fallthrough
      default:
        instanceToUse = finishedWork.stateNode;
    }
    // 如果ref是个函数的话，支持返回ref清理函数
    // 可以支持引用如地图组件时，保存地图实例，卸载的时候可以清除地图实例，避免内存泄漏
    if (typeof ref === 'function') {
      if (shouldProfile(finishedWork)) {
        try {
          startEffectTimer();
          finishedWork.refCleanup = ref(instanceToUse);
        } finally {
          recordEffectDuration(finishedWork);
        }
      } else {
        finishedWork.refCleanup = ref(instanceToUse);
      }
    } else {
      if (__DEV__) {
        // TODO: We should move these warnings to happen during the render
        // phase (markRef).
        if (typeof ref === 'string') {
          console.error('String refs are no longer supported.');
        } else if (!ref.hasOwnProperty('current')) {
          console.error(
            'Unexpected ref object provided for %s. ' +
              'Use either a ref-setter function or React.createRef().',
            getComponentNameFromFiber(finishedWork),
          );
        }
      }

      // $FlowFixMe[incompatible-use] unable to narrow type to the non-function case
      // 保存实例
      ref.current = instanceToUse;
    }
  }
}

// Capture errors so they don't interrupt mounting.
// 带有try catch的绑定ref
export function safelyAttachRef(
  current: Fiber,
  nearestMountedAncestor: Fiber | null,
) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(current, commitAttachRef, current);
    } else {
      commitAttachRef(current);
    }
  } catch (error) {
    captureCommitPhaseError(current, nearestMountedAncestor, error);
  }
}

// 执行ref的清理 解绑ref
export function safelyDetachRef(
  current: Fiber,
  nearestMountedAncestor: Fiber | null,
) {
  const ref = current.ref;
  // 这里可以看出ref支持refCleanup清理函数
  const refCleanup = current.refCleanup;

  if (ref !== null) {
    // 执行清理函数
    if (typeof refCleanup === 'function') {
      try {
        if (shouldProfile(current)) {
          try {
            startEffectTimer();
            if (__DEV__) {
              runWithFiberInDEV(current, refCleanup);
            } else {
              refCleanup();
            }
          } finally {
            recordEffectDuration(current);
          }
        } else {
          if (__DEV__) {
            runWithFiberInDEV(current, refCleanup);
          } else {
            refCleanup();
          }
        }
      } catch (error) {
        captureCommitPhaseError(current, nearestMountedAncestor, error);
      } finally {
        // `refCleanup` has been called. Nullify all references to it to prevent double invocation.
        current.refCleanup = null;
        // 清空双缓存节点函数引用
        const finishedWork = current.alternate;
        if (finishedWork != null) {
          finishedWork.refCleanup = null;
        }
      }
      // 将ref设置为空
    } else if (typeof ref === 'function') {
      try {
        if (shouldProfile(current)) {
          try {
            startEffectTimer();
            if (__DEV__) {
              runWithFiberInDEV(current, ref, null) as void;
            } else {
              ref(null);
            }
          } finally {
            recordEffectDuration(current);
          }
        } else {
          if (__DEV__) {
            runWithFiberInDEV(current, ref, null) as void;
          } else {
            ref(null);
          }
        }
      } catch (error) {
        captureCommitPhaseError(current, nearestMountedAncestor, error);
      }
    } else {
      // $FlowFixMe[incompatible-use] unable to narrow type to RefObject
      ref.current = null;
    }
  }
}

// 就是调用清理函数 effect返回的回调函数之类的
function safelyCallDestroy(
  current: Fiber,
  nearestMountedAncestor: Fiber | null,
  destroy: (() => void) | (({...}) => void),
  resource?: {...} | void | null,
) {
  // $FlowFixMe[extra-arg] @poteto this is safe either way because the extra arg is ignored if it's not a CRUD effect
  const destroy_ = resource == null ? destroy : destroy.bind(null, resource);
  if (__DEV__) {
    runWithFiberInDEV(
      current,
      callDestroyInDEV,
      current,
      nearestMountedAncestor,
      destroy_,
    );
  } else {
    try {
      // $FlowFixMe[incompatible-type](incompatible-call) Already bound to resource
      destroy_();
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  }
}

function commitProfiler(
  finishedWork: Fiber,
  current: Fiber | null,
  commitStartTime: number,
  effectDuration: number,
) {
  const {id, onCommit, onRender} = finishedWork.memoizedProps as ProfilerProps;

  let phase: ProfilerPhase = current === null ? 'mount' : 'update';
  if (enableProfilerNestedUpdatePhase) {
    if (isCurrentUpdateNested()) {
      phase = 'nested-update';
    }
  }

  if (typeof onRender === 'function') {
    onRender(
      id,
      phase,
      // $FlowFixMe[incompatible-type]: This should be always a number in profiling mode
      finishedWork.actualDuration,
      // $FlowFixMe[incompatible-type]: This should be always a number in profiling mode
      finishedWork.treeBaseDuration,
      // $FlowFixMe[incompatible-type]: This should be always a number in profiling mode
      finishedWork.actualStartTime,
      commitStartTime,
    );
  }

  if (enableProfilerCommitHooks) {
    if (typeof onCommit === 'function') {
      onCommit(id, phase, effectDuration, commitStartTime);
    }
  }
}

export function commitProfilerUpdate(
  finishedWork: Fiber,
  current: Fiber | null,
  commitStartTime: number,
  effectDuration: number,
) {
  if (enableProfilerTimer) {
    try {
      if (__DEV__) {
        runWithFiberInDEV(
          finishedWork,
          commitProfiler,
          finishedWork,
          current,
          commitStartTime,
          effectDuration,
        );
      } else {
        commitProfiler(finishedWork, current, commitStartTime, effectDuration);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
}

function commitProfilerPostCommitImpl(
  finishedWork: Fiber,
  current: Fiber | null,
  commitStartTime: number,
  passiveEffectDuration: number,
): void {
  const {id, onPostCommit} = finishedWork.memoizedProps;

  let phase = current === null ? 'mount' : 'update';
  if (enableProfilerNestedUpdatePhase) {
    if (isCurrentUpdateNested()) {
      phase = 'nested-update';
    }
  }

  if (typeof onPostCommit === 'function') {
    onPostCommit(id, phase, passiveEffectDuration, commitStartTime);
  }
}

export function commitProfilerPostCommit(
  finishedWork: Fiber,
  current: Fiber | null,
  commitStartTime: number,
  passiveEffectDuration: number,
) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(
        finishedWork,
        commitProfilerPostCommitImpl,
        finishedWork,
        current,
        commitStartTime,
        passiveEffectDuration,
      );
    } else {
      commitProfilerPostCommitImpl(
        finishedWork,
        current,
        commitStartTime,
        passiveEffectDuration,
      );
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
