/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  enableCreateEventHandleAPI,
  enableEffectEventMutationPhase,
} from 'shared/ReactFeatureFlags';

export type Flags = number;

// Don't change these values. They're used by React Dev Tools.
// 没有任何副作用标记。
export const NoFlags = /*                      */ 0b0000000000000000000000000000000;
// 当前 Fiber 在本次 render 中执行过工作，主要供 DevTools 和性能统计使用。
export const PerformedWork = /*                */ 0b0000000000000000000000000000001;
// 当前 Fiber 对应的节点需要在 Commit 阶段插入或移动。
export const Placement = /*                    */ 0b0000000000000000000000000000010;
// Suspense 或错误边界已经捕获了一次挂起或错误。
export const DidCapture = /*                   */ 0b0000000000000000000000010000000;
// 当前 Fiber 正在复用服务端渲染生成的 DOM。
export const Hydrating = /*                    */ 0b0000000000000000001000000000000;

// You can change the rest (and add more).
// 当前 Fiber 需要在 Commit 阶段更新 DOM、执行布局 Effect 或生命周期。
export const Update = /*                       */ 0b0000000000000000000000000000100;
// 持久化渲染模式下，当前 Fiber 的宿主实例已经被克隆。
export const Cloned = /*                       */ 0b0000000000000000000000000001000;

// 当前 Fiber 的 deletions 中存在需要卸载的旧子树。
export const ChildDeletion = /*                */ 0b0000000000000000000000000010000;
// 插入新子节点前，需要先清空宿主节点原有的文本内容。
export const ContentReset = /*                 */ 0b0000000000000000000000000100000;
// 当前 Fiber 的更新队列中存在 Commit 后需要执行的回调。
export const Callback = /*                     */ 0b0000000000000000000000001000000;
/* Used by DidCapture:                            0b0000000000000000000000010000000; */

// Hydration 无法继续复用服务端 DOM，需要改为客户端渲染。
export const ForceClientRender = /*            */ 0b0000000000000000000000100000000;
// ref 发生挂载、更新或卸载，需要在 Commit 阶段处理。
export const Ref = /*                          */ 0b0000000000000000000001000000000;
// Commit 修改 DOM 前需要读取快照，例如调用 getSnapshotBeforeUpdate。
export const Snapshot = /*                     */ 0b0000000000000000000010000000000;
// 当前 Fiber 存在需要执行或清理的 useEffect。
export const Passive = /*                      */ 0b0000000000000000000100000000000;
/* Used by Hydrating:                             0b0000000000000000001000000000000; */

// Offscreen 或 Suspense 子树的显示、隐藏状态发生变化。
export const Visibility = /*                   */ 0b0000000000000000010000000000000;
// useSyncExternalStore 需要在 Commit 前检查外部 Store 是否保持一致。
export const StoreConsistency = /*             */ 0b0000000000000000100000000000000;

// It's OK to reuse these bits because these flags are mutually exclusive for
// different fiber types. We should really be doing this for as many flags as
// possible, because we're about to run out of bits.
// 复用服务端 DOM 后，宿主实例还需要执行一次 hydration 提交处理。
export const Hydrate = Callback;
// Suspense 边界捕获到可重试内容，需要安排一次重试。
export const ScheduleRetry = StoreConsistency;
// 当前宿主资源尚未准备好，Commit 阶段可能需要暂停。
export const ShouldSuspendCommit = Visibility;
// 显式命名的 ViewTransition 是本次新挂载的，用于查找进入/退出配对。
export const ViewTransitionNamedMount = ShouldSuspendCommit;
// Suspense 主子树产生了 deferred lane，需要为延迟工作继续安排渲染。
export const DidDefer = ContentReset;
// form action 完成后，需要重置对应的表单。
export const FormReset = Snapshot;
// 当前 ViewTransition 的布局变化可能影响父级的尺寸或位置。
export const AffectedParentLayout = ContentReset;

// Commit 阶段需要处理的生命周期类副作用集合。
export const LifecycleEffectMask =
  Passive | Update | Callback | Ref | Snapshot | StoreConsistency;

// Union of all commit flags (flags with the lifetime of a particular commit)
// 所有只在当前 Commit 中有效的宿主副作用标记集合。
export const HostEffectMask = /*               */ 0b0000000000000000111111111111111;

// These are not really side effects, but we still reuse this field.
// 当前 Fiber 未完成构建，通常表示 render 时抛出了错误或 Promise。
export const Incomplete = /*                   */ 0b0000000000000001000000000000000;
// 当前边界需要在 unwind 阶段捕获错误或 Suspense 挂起。
export const ShouldCapture = /*                */ 0b0000000000000010000000000000000;
// Legacy Suspense 场景下，需要强制 class 组件重新渲染。
export const ForceUpdateForLegacySuspense = /* */ 0b0000000000000100000000000000000;
// 当前 Fiber 已经向子树传播过 Context 变化，避免重复传播。
export const DidPropagateContext = /*          */ 0b0000000000001000000000000000000;
// 当前 Fiber 的 Context 变化仍需要向子树传播。
export const NeedsPropagation = /*             */ 0b0000000000010000000000000000000;

// Static tags describe aspects of a fiber that are not specific to a render,
// e.g. a fiber uses a passive effect (even if there are no updates on this particular render).
// This enables us to defer more work in the unmount case,
// since we can defer traversing the tree during layout to look for Passive effects,
// and instead rely on the static flag as a signal that there may be cleanup work.
// 当前节点来自一个分叉的子节点列表，用于 Hydration/useId 计算稳定的树路径。
export const Forked = /*                       */ 0b0000000000100000000000000000000;
// 子树长期具有 Snapshot 阶段工作；当前也被具名 ViewTransition 复用。
export const SnapshotStatic = /*               */ 0b0000000001000000000000000000000;
// 子树长期具有布局阶段工作，例如 class 生命周期或 useLayoutEffect。
export const LayoutStatic = /*                 */ 0b0000000010000000000000000000000;
// 当前版本中 ref 的静态标记与 LayoutStatic 共用同一个二进制位。
export const RefStatic = LayoutStatic;
// 子树长期存在 Passive Effect，即使本次 render 没有触发该 Effect。
export const PassiveStatic = /*                */ 0b0000000100000000000000000000000;
// 子树中存在可能导致 Commit 暂停的宿主资源。
export const MaySuspendCommit = /*             */ 0b0000001000000000000000000000000;
// ViewTransitionNamedStatic tracks explicitly name ViewTransition components deeply
// that might need to be visited during clean up. This is similar to SnapshotStatic
// if there was any other use for it. It also needs to run in the same phase as
// MaySuspendCommit tracking.
// 子树中存在显式命名的 ViewTransition，清理阶段需要继续访问。
export const ViewTransitionNamedStatic =
  /*    */ SnapshotStatic | MaySuspendCommit;
// ViewTransitionStatic tracks whether there are an ViewTransition components from
// the nearest HostComponent down. It resets at every HostComponent level.
// 最近的 HostComponent 以下存在 ViewTransition，用于跳过无关子树。
export const ViewTransitionStatic = /*         */ 0b0000010000000000000000000000000;
// ViewTransitionStaticParent tracks whether there are ViewTransition components
// with parentEnter/parentExit props. Unlike ViewTransitionStatic, this is NOT
// cleared by HostComponents so it can be used to skip subtrees in parent walks.
// 子树中存在配置 parentEnter/parentExit 的 ViewTransition。
export const ViewTransitionStaticParent = /*   */ 0b1000000000000000000000000000000;
// Tracks whether a HostPortal is present in the tree.
// 子树中存在 Portal，提交或事件处理时不能直接跳过该子树。
export const PortalStatic = /*                 */ 0b0000100000000000000000000000000;

// Flag used to identify newly inserted fibers. It isn't reset after commit unlike `Placement`.
// DEV 环境中记录 Fiber 是新插入的，供 Strict Effects 等开发检查使用。
export const PlacementDEV = /*                 */ 0b0001000000000000000000000000000;
// DEV 严格模式下，需要额外执行一次布局 Effect 的挂载和清理。
export const MountLayoutDev = /*               */ 0b0010000000000000000000000000000;
// DEV 严格模式下，需要额外执行一次 Passive Effect 的挂载和清理。
export const MountPassiveDev = /*              */ 0b0100000000000000000000000000000;

// Groups of flags that are used in the commit phase to skip over trees that
// don't contain effects, by checking subtreeFlags.

// Before Mutation 阶段需要访问的副作用集合。
export const BeforeMutationMask: number =
  Snapshot |
  (enableCreateEventHandleAPI
    ? // createEventHandle needs to visit deleted and hidden trees to
      // fire beforeblur
      // TODO: Only need to visit Deletions during BeforeMutation phase if an
      // element is focused.
      Update | ChildDeletion | Visibility
    : // useEffectEvent uses the snapshot phase,
      // but we're moving it to the mutation phase.
      enableEffectEventMutationPhase
      ? 0
      : Update);

// For View Transition support we use the snapshot phase to scan the tree for potentially
// affected ViewTransition components.
// ViewTransition 在 DOM 修改前后都需要检查的结构变化集合。
export const BeforeAndAfterMutationTransitionMask: number =
  Snapshot | Update | Placement | ChildDeletion | Visibility | ContentReset;

// Mutation 阶段会实际修改 DOM、可见性或 ref 的副作用集合。
export const MutationMask =
  Placement |
  Update |
  ChildDeletion |
  ContentReset |
  Ref |
  Hydrating |
  Visibility |
  FormReset;
// Layout 阶段需要执行的生命周期、布局 Effect、回调和 ref 集合。
export const LayoutMask = Update | Callback | Ref | Visibility;

// TODO: Split into PassiveMountMask and PassiveUnmountMask
// Passive 阶段需要执行或清理 useEffect 的副作用集合。
export const PassiveMask = Passive | Visibility | ChildDeletion;

// For View Transitions we need to visit anything we visited in the snapshot phase to
// restore the view-transition-name after committing the transition.
// ViewTransition 提交后恢复名称时需要访问的副作用集合。
export const PassiveTransitionMask: number = PassiveMask | Update | Placement;

// Union of tags that don't get reset on clones.
// This allows certain concepts to persist without recalculating them,
// e.g. whether a subtree contains passive effects or portals.
// 创建 workInProgress/alternate 时不会被清除的静态标记集合。
export const StaticMask =
  LayoutStatic |
  PassiveStatic |
  RefStatic |
  MaySuspendCommit |
  ViewTransitionStatic |
  ViewTransitionStaticParent |
  ViewTransitionNamedStatic |
  PortalStatic |
  Forked;
