/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type WorkTag =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31;

// WorkTag 标识一个 Fiber 要执行哪一种工作。它决定 beginWork、completeWork 和
// commitWork 等阶段进入哪个处理分支。数值 2 和 20 是历史实现留下的空位，
// 当前没有对应的 WorkTag 常量；这些数值属于 React 内部协议，不应由业务代码依赖。

// 普通函数组件：执行组件函数及 Hooks，并协调函数返回的 children。
export const FunctionComponent = 0;
// Class 组件：创建/更新类实例，处理 state、生命周期、ref 和错误边界。
export const ClassComponent = 1;
// 宿主树根 Fiber：连接 FiberRoot，保存整个应用的根状态和根更新队列。
export const HostRoot = 3; // Root of a host tree. Could be nested inside another node.
// Portal 子树入口：让 children 提交到另一个宿主容器，而非当前父节点的 DOM 中。
export const HostPortal = 4; // A subtree. Could be an entry point to a different renderer.
// 普通宿主元素；在 React DOM 中对应 div、button 等真实 DOM Element。
export const HostComponent = 5;
// 宿主文本节点；在 React DOM 中对应真实 Text 节点。
export const HostText = 6;
// Fragment：只对子节点分组，不创建额外宿主节点。
export const Fragment = 7;
// 模式包装节点：自身不输出 UI，用来给子树附加 StrictMode 等 Fiber mode 标记。
export const Mode = 8;
// 现代 Context Consumer：读取 Context 当前值，并用 render function 生成 children。
export const ContextConsumer = 9;
// 现代 Context Provider：把 value 压入 Context 栈，并在值变化时传播更新。
export const ContextProvider = 10;
// forwardRef 包装节点：调用 render(props, ref)，将 ref 显式传给内部函数组件。
export const ForwardRef = 11;
// Profiler 边界：统计子树 Render、Commit 和 Effect 耗时，并触发性能回调。
export const Profiler = 12;
// Suspense 边界：主内容挂起时协调 fallback、重试、hydration 和 Offscreen 子树。
export const SuspenseComponent = 13;
// 通用 React.memo 包装节点：支持自定义 compare，内部通常再创建被包装组件的 Fiber。
export const MemoComponent = 14;
// React.memo 的快速路径：普通函数组件且使用默认浅比较时，可直接复用一个 Fiber。
export const SimpleMemoComponent = 15;
// React.lazy 节点：解析懒加载结果后，再转换成真正的函数、类或其他组件 Tag。
export const LazyComponent = 16;
// 首次挂载尚未完成的 Class 组件：曾抛错或挂起，不能当作已成功挂载的实例处理。
export const IncompleteClassComponent = 17;
// 尚未 hydration 的服务端片段：代表仍由现有服务端 HTML 占位的子树。
export const DehydratedFragment = 18;
// SuspenseList：按 revealOrder/tail 协调多个 Suspense 边界的显示顺序。
export const SuspenseListComponent = 19;
// 实验性 Scope API 边界：为一组后代宿主节点提供查询、事件和聚焦等作用域能力。
export const ScopeComponent = 21;
// Offscreen 边界：控制子树可见/隐藏、预渲染、暂停恢复以及 Effect 的连接状态。
export const OffscreenComponent = 22;
// 旧版隐藏边界：为 unstable_LegacyHidden 保留的兼容实现，由 Feature Flag 控制。
export const LegacyHiddenComponent = 23;
// Cache 边界：为子树提供独立 React Cache，并管理 Cache 的 retain/release 生命周期。
export const CacheComponent = 24;
// Transition tracing 标记：跟踪 Transition 内尚未完成的 Suspense 边界和完成回调。
export const TracingMarkerComponent = 25;
// 可提升宿主资源：DOM 中可移动到 head 并去重的 title、meta、style、link、script 等。
// 就是意思在react组件里写的link之类的标签，在实际dom节点里会被提升到head里面
export const HostHoistable = 26;
// 宿主单例：DOM 中全局唯一并复用现有实例的 html、head、body。
export const HostSingleton = 27;
// 首次挂载尚未完成的函数组件：曾抛错或挂起，重试时重新按 FunctionComponent 处理。
export const IncompleteFunctionComponent = 28;
// 抛出节点：把协调 children 时遇到的 Error/Thenable 物化成 Fiber，在 beginWork 中重抛。
export const Throw = 29;
// View Transition 边界：为宿主节点生成/配对 transition name，并协调视图过渡快照和动画。
export const ViewTransitionComponent = 30;
// Activity 边界：控制子树 visible/hidden，隐藏时保留状态并管理 DOM、更新和 Effect 活性。
export const ActivityComponent = 31;
