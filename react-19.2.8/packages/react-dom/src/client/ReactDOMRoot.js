/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList, ReactFormState} from 'shared/ReactTypes';
import type {
  FiberRoot,
  TransitionTracingCallbacks,
} from 'react-reconciler/src/ReactInternalTypes';

import {isValidContainer} from 'react-dom-bindings/src/client/ReactDOMContainer';
import {queueExplicitHydrationTarget} from 'react-dom-bindings/src/events/ReactDOMEventReplaying';
import {REACT_ELEMENT_TYPE} from 'shared/ReactSymbols';
import {
  disableCommentsAsDOMContainers,
  enableDefaultTransitionIndicator,
} from 'shared/ReactFeatureFlags';

export type RootType = {
  render(children: ReactNodeList): void,
  unmount(): void,
  _internalRoot: FiberRoot | null,
};

export type CreateRootOptions = {
  unstable_strictMode?: boolean,
  unstable_transitionCallbacks?: TransitionTracingCallbacks,
  identifierPrefix?: string,
  onUncaughtError?: (
    error: mixed,
    errorInfo: {+componentStack?: ?string},
  ) => void,
  onCaughtError?: (
    error: mixed,
    errorInfo: {
      +componentStack?: ?string,
      +errorBoundary?: ?component(...props: any),
    },
  ) => void,
  onRecoverableError?: (
    error: mixed,
    errorInfo: {+componentStack?: ?string},
  ) => void,
  onDefaultTransitionIndicator?: () => void | (() => void),
};

export type HydrateRootOptions = {
  // Hydration options
  onHydrated?: (hydrationBoundary: Comment) => void,
  onDeleted?: (hydrationBoundary: Comment) => void,
  // Options for all roots
  unstable_strictMode?: boolean,
  unstable_transitionCallbacks?: TransitionTracingCallbacks,
  identifierPrefix?: string,
  onUncaughtError?: (
    error: mixed,
    errorInfo: {+componentStack?: ?string},
  ) => void,
  onCaughtError?: (
    error: mixed,
    errorInfo: {
      +componentStack?: ?string,
      +errorBoundary?: ?component(...props: any),
    },
  ) => void,
  onRecoverableError?: (
    error: mixed,
    errorInfo: {+componentStack?: ?string},
  ) => void,
  onDefaultTransitionIndicator?: () => void | (() => void),
  formState?: ReactFormState<any, any> | null,
};

import {
  isContainerMarkedAsRoot,
  markContainerAsRoot,
  unmarkContainerAsRoot,
} from 'react-dom-bindings/src/client/ReactDOMComponentTree';
import {listenToAllSupportedEvents} from 'react-dom-bindings/src/events/DOMPluginEventSystem';
import {COMMENT_NODE} from 'react-dom-bindings/src/client/HTMLNodeType';

import {
  createContainer,
  createHydrationContainer,
  updateContainer,
  updateContainerSync,
  flushSyncWork,
  isAlreadyRendering,
  defaultOnUncaughtError,
  defaultOnCaughtError,
  defaultOnRecoverableError,
} from 'react-reconciler/src/ReactFiberReconciler';
import {defaultOnDefaultTransitionIndicator} from './ReactDOMDefaultTransitionIndicator';
import {ConcurrentRoot} from 'react-reconciler/src/ReactRootTags';

// $FlowFixMe[missing-this-annot]
function ReactDOMRoot(internalRoot: FiberRoot) {
  // 保存fiberroot 
  this._internalRoot = internalRoot;
}

// $FlowFixMe[prop-missing] found when upgrading Flow
// render实例化函数
ReactDOMHydrationRoot.prototype.render = ReactDOMRoot.prototype.render =
  // $FlowFixMe[missing-this-annot]
  function (children: ReactNodeList): void {
    const root = this._internalRoot;
    if (root === null) {
      throw new Error('Cannot update an unmounted root.');
    }

    if (__DEV__) {
      // using a reference to `arguments` bails out of GCC optimizations which affect function arity
      const args = arguments;
      if (typeof args[1] === 'function') {
        console.error(
          'does not support the second callback argument. ' +
            'To execute a side effect after rendering, declare it in a component body with useEffect().',
        );
      } else if (isValidContainer(args[1])) {
        console.error(
          'You passed a container to the second argument of root.render(...). ' +
            "You don't need to pass it again since you already passed it to create the root.",
        );
      } else if (typeof args[1] !== 'undefined') {
        console.error(
          'You passed a second argument to root.render(...) but it only accepts ' +
            'one argument.',
        );
      }
    }
    // 渲染节点
    updateContainer(children, root, null, null);
  };

// 卸载节点函数实现
// $FlowFixMe[prop-missing] found when upgrading Flow
ReactDOMHydrationRoot.prototype.unmount = ReactDOMRoot.prototype.unmount =
  // $FlowFixMe[missing-this-annot]
  function (): void {
    if (__DEV__) {
      // using a reference to `arguments` bails out of GCC optimizations which affect function arity
      const args = arguments;
      if (typeof args[0] === 'function') {
        console.error(
          'does not support a callback argument. ' +
            'To execute a side effect after rendering, declare it in a component body with useEffect().',
        );
      }
    }
    const root = this._internalRoot;
    if (root !== null) {
      this._internalRoot = null;
      const container = root.containerInfo;
      if (__DEV__) {
        if (isAlreadyRendering()) {
          console.error(
            'Attempted to synchronously unmount a root while React was already ' +
              'rendering. React cannot finish unmounting the root until the ' +
              'current render has completed, which may lead to a race condition.',
          );
        }
      }
      // 同步更新dom
      updateContainerSync(null, root, null, null);
      flushSyncWork();
      // 移除fiberroot的引用
      unmarkContainerAsRoot(container);
    }
  };

export function createRoot(
  container: Element | Document | DocumentFragment,
  options?: CreateRootOptions,
): RootType {
  // 检查是否是有效dom元素或者容器
  if (!isValidContainer(container)) {
    throw new Error('Target container is not a DOM element.');
  }

  warnIfReactDOMContainerInDEV(container);

  const concurrentUpdatesByDefaultOverride = false;
  let isStrictMode = false;
  let identifierPrefix = '';
  // 错误捕获处理器
  let onUncaughtError = defaultOnUncaughtError;
  let onCaughtError = defaultOnCaughtError;
  let onRecoverableError = defaultOnRecoverableError;
  // 处理过滤和拦截navigate
  let onDefaultTransitionIndicator = defaultOnDefaultTransitionIndicator;
  let transitionCallbacks = null;

  // $FlowFixMe[invalid-compare]
  if (options !== null && options !== undefined) {
    if (__DEV__) {
      if ((options as any).hydrate) {
        console.warn(
          'hydrate through createRoot is deprecated. Use ReactDOMClient.hydrateRoot(container, <App />) instead.',
        );
      } else {
        if (
          typeof options === 'object' &&
          // $FlowFixMe[invalid-compare]
          options !== null &&
          (options as any).$$typeof === REACT_ELEMENT_TYPE
        ) {
          console.error(
            'You passed a JSX element to createRoot. You probably meant to ' +
              'call root.render instead. ' +
              'Example usage:\n\n' +
              '  let root = createRoot(domContainer);\n' +
              '  root.render(<App />);',
          );
        }
      }
    }
    if (options.unstable_strictMode === true) {
      isStrictMode = true;
    }
    // 处理多个root的冲突问题
    if (options.identifierPrefix !== undefined) {
      identifierPrefix = options.identifierPrefix;
    }
    if (options.onUncaughtError !== undefined) {
      onUncaughtError = options.onUncaughtError;
    }
    if (options.onCaughtError !== undefined) {
      onCaughtError = options.onCaughtError;
    }
    if (options.onRecoverableError !== undefined) {
      onRecoverableError = options.onRecoverableError;
    }
    if (enableDefaultTransitionIndicator) {
      if (options.onDefaultTransitionIndicator !== undefined) {
        onDefaultTransitionIndicator = options.onDefaultTransitionIndicator;
      }
    }
    if (options.unstable_transitionCallbacks !== undefined) {
      transitionCallbacks = options.unstable_transitionCallbacks;
    }
  }
  /*
   * 创建内部 FiberRoot。这里的 root 不是最终返回给用户的 ReactDOMRoot；
   * ReactDOMRoot 只是通过 _internalRoot 持有它。FiberRoot 是整个应用的
   * 调度中心，也是已提交 Fiber 树、待处理更新、缓存及错误处理器的容器。
   *
   * FiberRoot 的主要属性（部分属性只在对应 Feature Flag 开启时存在）：
   *
   * 一、根节点和宿主容器
   * - tag：Root 类型，如 ConcurrentRoot。
   * - containerInfo：React 树挂载的 DOM Element、Document 或 DocumentFragment。
   * - pendingChildren：持久化渲染器暂存的待提交子节点；DOM mutation 模式通常不用。
   * - current：当前已经提交的 HostRoot Fiber，也是整棵 current Fiber 树的入口。
   * - context：当前根 Context，主要供旧版 renderSubtreeIntoContainer 使用。
   * - pendingContext：下一次提交后需要替换 context 的待生效 Context。
   *
   * 二、Root 调度状态
   * - next：把所有存在待处理工作的 Root 串成单向链表。
   * - callbackNode：Scheduler 为该 Root 创建的当前任务节点，可用于取消或复用任务。
   * - callbackPriority：callbackNode 对应的 Lane 优先级，用于判断是否需要重新调度。
   * - timeoutHandle：延迟提交或 Suspense fallback 使用的定时器句柄。
   * - cancelPendingCommit：取消尚未执行的 Commit；没有待提交任务时为 null。
   * - pingCache：记录 Wakeable/Thenable 与监听它的 Lane，避免重复注册 ping 回调。
   *
   * 三、Lane 和更新状态
   * - pendingLanes：Root 上所有尚未完成的更新 Lane。
   * - suspendedLanes：因为 Suspense 等原因被阻塞的 Lane。
   * - pingedLanes：异步依赖已经完成、可以重新尝试的 suspended Lane。
   * - warmLanes：本轮已尝试过的 suspended Lane，帮助选择下一次重试策略。
   * - expiredLanes：等待过久、已过期并需要同步处理的 Lane。
   * - expirationTimes：每个 Lane 的过期时间。
   * - hiddenUpdates：隐藏的 Offscreen/Activity 子树中按 Lane 保存的更新。
   * - errorRecoveryDisabledLanes：禁止再次尝试并发错误恢复的 Lane。
   * - shellSuspendCounter：Root shell 连续挂起次数，用于控制错误恢复策略。
   * - entangledLanes：必须作为一组一起处理的 Lane。
   * - entanglements：记录每个 Lane 与哪些其他 Lane 相互绑定。
   * - indicatorLanes：可能需要默认 Transition loading indicator 的 Lane。
   *
   * 四、Render Cache
   * - pooledCache：Render 期间供新挂载 Cache/Suspense/Offscreen 边界临时共享的 Cache。
   * - pooledCacheLanes：仍然依赖 pooledCache 的 Lane；归零后可释放 pooledCache。
   *
   * 五、标识符、表单和错误处理
   * - identifierPrefix：useId、SSR/Flight ID 等 React 自动标识符的 Root 级前缀。
   * - formState：SSR hydration 时需要恢复的 React Form 状态。
   * - onUncaughtError：处理未被 Error Boundary 捕获的错误。
   * - onCaughtError：处理已经被 Error Boundary 捕获的错误。
   * - onRecoverableError：处理 hydration 等场景中 React 能自动恢复的错误。
   * - onDefaultTransitionIndicator：启动默认 Transition 加载指示器，并可返回清理函数。
   * - pendingIndicator：当前默认 Transition 指示器的清理函数。
   *
   * 六、可选能力
   * - hydrationCallbacks：Suspense/Activity hydration 完成或删除时的回调。
   * - transitionTypes：当前 View Transition 的类型集合。
   * - pendingGestures：等待执行的 Gesture Transition。
   * - gestureClone：Gesture Transition 使用的宿主节点副本。
   * - transitionCallbacks：Transition tracing 的开始、进度和完成回调。
   * - transitionLanes：每个 Lane 对应的、正在被追踪的 Transition 集合。
   * - incompleteTransitions：尚未完成的 Transition 及其 pending boundary 信息。
   *
   * 七、Profiler 和开发调试
   * - effectDuration：本次 Commit 中 layout effect 的累计耗时。
   * - passiveEffectDuration：本次 Commit 中 passive effect 的累计耗时。
   * - memoizedUpdaters：DevTools 用来展示本次更新来源的 Fiber 集合。
   * - pendingUpdatersLaneMap：按 Lane 保存触发更新的 Fiber，供 DevTools 使用。
   * - _debugRootType：开发环境下标识 createRoot、hydrateRoot 等 Root 创建方式。
   *
   * 注意：当前 React 节点、hydration 标记和 Root 正式 Cache 不直接放在 FiberRoot 上，
   * 而是保存在 root.current.memoizedState 的 element、isDehydrated、cache 字段中。
   */
  const root = createContainer(
    container,
    ConcurrentRoot,
    null,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onUncaughtError,
    onCaughtError,
    onRecoverableError,
    onDefaultTransitionIndicator,
    transitionCallbacks,
  );
  // 讲渲染树挂载保存引用到容器上
  markContainerAsRoot(root.current, container);
  // 处理掉注释节点
  const rootContainerElement: Document | Element | DocumentFragment =
    !disableCommentsAsDOMContainers && container.nodeType === COMMENT_NODE
      ? (container.parentNode as any)
      : container;
  // 监听绑定所有事件
  listenToAllSupportedEvents(rootContainerElement);

  // $FlowFixMe[invalid-constructor] Flow no longer supports calling new on functions
  // 实例化react root 保存root即fiber root引用 后面在render里用riber root渲染
  return new ReactDOMRoot(root);
}

// $FlowFixMe[missing-this-annot]
function ReactDOMHydrationRoot(internalRoot: FiberRoot) {
  this._internalRoot = internalRoot;
}
function scheduleHydration(target: Node) {
  if (target) {
    queueExplicitHydrationTarget(target);
  }
}
// $FlowFixMe[prop-missing] found when upgrading Flow
ReactDOMHydrationRoot.prototype.unstable_scheduleHydration = scheduleHydration;

export function hydrateRoot(
  container: Document | Element,
  initialChildren: ReactNodeList,
  options?: HydrateRootOptions,
): RootType {
  if (!isValidContainer(container)) {
    throw new Error('Target container is not a DOM element.');
  }

  warnIfReactDOMContainerInDEV(container);

  if (__DEV__) {
    if (initialChildren === undefined) {
      console.error(
        'Must provide initial children as second argument to hydrateRoot. ' +
          'Example usage: hydrateRoot(domContainer, <App />)',
      );
    }
  }

  // For now we reuse the whole bag of options since they contain
  // the hydration callbacks.
  const hydrationCallbacks = options != null ? options : null;

  const concurrentUpdatesByDefaultOverride = false;
  let isStrictMode = false;
  let identifierPrefix = '';
  let onUncaughtError = defaultOnUncaughtError;
  let onCaughtError = defaultOnCaughtError;
  let onRecoverableError = defaultOnRecoverableError;
  let onDefaultTransitionIndicator = defaultOnDefaultTransitionIndicator;
  let transitionCallbacks = null;
  let formState = null;
  // $FlowFixMe[invalid-compare]
  if (options !== null && options !== undefined) {
    if (options.unstable_strictMode === true) {
      isStrictMode = true;
    }
    if (options.identifierPrefix !== undefined) {
      identifierPrefix = options.identifierPrefix;
    }
    if (options.onUncaughtError !== undefined) {
      onUncaughtError = options.onUncaughtError;
    }
    if (options.onCaughtError !== undefined) {
      onCaughtError = options.onCaughtError;
    }
    if (options.onRecoverableError !== undefined) {
      onRecoverableError = options.onRecoverableError;
    }
    if (enableDefaultTransitionIndicator) {
      if (options.onDefaultTransitionIndicator !== undefined) {
        onDefaultTransitionIndicator = options.onDefaultTransitionIndicator;
      }
    }
    if (options.unstable_transitionCallbacks !== undefined) {
      transitionCallbacks = options.unstable_transitionCallbacks;
    }
    if (options.formState !== undefined) {
      formState = options.formState;
    }
  }

  const root = createHydrationContainer(
    initialChildren,
    null,
    container,
    ConcurrentRoot,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onUncaughtError,
    onCaughtError,
    onRecoverableError,
    onDefaultTransitionIndicator,
    transitionCallbacks,
    formState,
  );
  markContainerAsRoot(root.current, container);
  // This can't be a comment node since hydration doesn't work on comment nodes anyway.
  listenToAllSupportedEvents(container);

  // $FlowFixMe[invalid-constructor] Flow no longer supports calling new on functions
  return new ReactDOMHydrationRoot(root);
}

function warnIfReactDOMContainerInDEV(container: any) {
  if (__DEV__) {
    if (isContainerMarkedAsRoot(container)) {
      if (container._reactRootContainer) {
        console.error(
          'You are calling ReactDOMClient.createRoot() on a container that was previously ' +
            'passed to ReactDOM.render(). This is not supported.',
        );
      } else {
        console.error(
          'You are calling ReactDOMClient.createRoot() on a container that ' +
            'has already been passed to createRoot() before. Instead, call ' +
            'root.render() on the existing root instead if you want to update it.',
        );
      }
    }
  }
}
