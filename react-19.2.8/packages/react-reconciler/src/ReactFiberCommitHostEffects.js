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
  ChildSet,
  FragmentInstanceType,
} from './ReactFiberConfig';
import type {Fiber, FiberRoot} from './ReactInternalTypes';

import {
  HostRoot,
  HostComponent,
  HostHoistable,
  HostSingleton,
  HostText,
  HostPortal,
  DehydratedFragment,
  Fragment,
} from './ReactWorkTags';
import {ContentReset, Placement} from './ReactFiberFlags';
import {
  supportsMutation,
  supportsResources,
  supportsSingletons,
  commitMount,
  commitUpdate,
  resetTextContent,
  commitTextUpdate,
  appendChild,
  appendChildToContainer,
  insertBefore,
  insertInContainerBefore,
  replaceContainerChildren,
  hideDehydratedBoundary,
  hideInstance,
  hideTextInstance,
  unhideDehydratedBoundary,
  unhideInstance,
  unhideTextInstance,
  commitHydratedInstance,
  commitHydratedContainer,
  commitHydratedActivityInstance,
  commitHydratedSuspenseInstance,
  removeChildFromContainer,
  removeChild,
  acquireSingletonInstance,
  releaseSingletonInstance,
  isSingletonScope,
  // 带 ref 的 Fragment 新增了一个 DOM 子节点，需要让这个新节点继承 Fragment 已有的统一行为。
  commitNewChildToFragmentInstance,
  deleteChildFromFragmentInstance,
} from './ReactFiberConfig';
import {captureCommitPhaseError} from './ReactFiberWorkLoop';
import {trackHostMutation} from './ReactFiberMutationTracking';

import {runWithFiberInDEV} from './ReactCurrentFiber';
import {
  enableFragmentRefs,
  enableFragmentRefsTextNodes,
} from 'shared/ReactFeatureFlags';

export function commitHostMount(finishedWork: Fiber) {
  const type = finishedWork.type;
  const props = finishedWork.memoizedProps;
  const instance: Instance = finishedWork.stateNode;
  try {
    if (__DEV__) {
      runWithFiberInDEV(
        finishedWork,
        commitMount,
        instance,
        type,
        props,
        finishedWork,
      );
    } else {
      commitMount(instance, type, props, finishedWork);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}

export function commitHostHydratedInstance(finishedWork: Fiber) {
  const type = finishedWork.type;
  const props = finishedWork.memoizedProps;
  const instance: Instance = finishedWork.stateNode;
  try {
    if (__DEV__) {
      runWithFiberInDEV(
        finishedWork,
        commitHydratedInstance,
        instance,
        type,
        props,
        finishedWork,
      );
    } else {
      commitHydratedInstance(instance, type, props, finishedWork);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}

export function commitHostUpdate(
  finishedWork: Fiber,
  newProps: any,
  oldProps: any,
): void {
  try {
    if (__DEV__) {
      runWithFiberInDEV(
        finishedWork,
        commitUpdate,
        finishedWork.stateNode,
        finishedWork.type,
        oldProps,
        newProps,
        finishedWork,
      );
    } else {
      commitUpdate(
        finishedWork.stateNode,
        finishedWork.type,
        oldProps,
        newProps,
        finishedWork,
      );
    }
    // Mutations are tracked manually from within commitUpdate.
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}


// 提交更新文本节点的内容
export function commitHostTextUpdate(
  finishedWork: Fiber,
  newText: string,
  oldText: string,
) {
  // 获取text文本dom节点
  const textInstance: TextInstance = finishedWork.stateNode;
  try {
    if (__DEV__) {
      runWithFiberInDEV(
        finishedWork,
        commitTextUpdate,
        textInstance,
        oldText,
        newText,
      );
    } else {
      // 提交文本节点更新 注入函数
      commitTextUpdate(textInstance, oldText, newText);
    }
    trackHostMutation();
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}

export function commitHostResetTextContent(finishedWork: Fiber) {
  const instance: Instance = finishedWork.stateNode;
  try {
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, resetTextContent, instance);
    } else {
      resetTextContent(instance);
    }
    trackHostMutation();
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}

export function commitShowHideSuspenseBoundary(node: Fiber, isHidden: boolean) {
  try {
    const instance = node.stateNode;
    if (isHidden) {
      if (__DEV__) {
        runWithFiberInDEV(node, hideDehydratedBoundary, instance);
      } else {
        hideDehydratedBoundary(instance);
      }
    } else {
      if (__DEV__) {
        runWithFiberInDEV(node, unhideDehydratedBoundary, node.stateNode);
      } else {
        unhideDehydratedBoundary(node.stateNode);
      }
    }
  } catch (error) {
    captureCommitPhaseError(node, node.return, error);
  }
}

export function commitShowHideHostInstance(node: Fiber, isHidden: boolean) {
  try {
    const instance = node.stateNode;
    if (isHidden) {
      if (__DEV__) {
        runWithFiberInDEV(node, hideInstance, instance);
      } else {
        hideInstance(instance);
      }
    } else {
      if (__DEV__) {
        runWithFiberInDEV(
          node,
          unhideInstance,
          node.stateNode,
          node.memoizedProps,
        );
      } else {
        unhideInstance(node.stateNode, node.memoizedProps);
      }
    }
  } catch (error) {
    captureCommitPhaseError(node, node.return, error);
  }
}

export function commitShowHideHostTextInstance(node: Fiber, isHidden: boolean) {
  try {
    const instance = node.stateNode;
    if (isHidden) {
      if (__DEV__) {
        runWithFiberInDEV(node, hideTextInstance, instance);
      } else {
        hideTextInstance(instance);
      }
    } else {
      if (__DEV__) {
        runWithFiberInDEV(
          node,
          unhideTextInstance,
          instance,
          node.memoizedProps,
        );
      } else {
        unhideTextInstance(instance, node.memoizedProps);
      }
    }
    trackHostMutation();
  } catch (error) {
    captureCommitPhaseError(node, node.return, error);
  }
}

// 所有fragment元素对子节点进行事件绑定监听 保证行为的统一
export function commitNewChildToFragmentInstances(
  fiber: Fiber,
  parentFragmentInstances: null | Array<FragmentInstanceType>,
): void {
  if (
    // 如果插入节点的类型是dom实例并且 不是文本节点或者说没开启文本节点的framentref
    // 或者还没初始化完 父节点已卸载或者没有加载
    (fiber.tag !== HostComponent &&
      !(enableFragmentRefsTextNodes && fiber.tag === HostText)) ||
    // Only run fragment insertion effects for initial insertions
    fiber.alternate !== null ||
    parentFragmentInstances === null
  ) {
    return;
  }
  // 对每一个fragment元素的实例进行事件的同步
  for (let i = 0; i < parentFragmentInstances.length; i++) {
    const fragmentInstance = parentFragmentInstances[i];
    // 对子节点实例进行事件监听处理 典型场景，fragment元素只有在所有子节点ready才切换视图
    commitNewChildToFragmentInstance(fiber.stateNode, fragmentInstance);
  }
}

export function commitFragmentInstanceInsertionEffects(fiber: Fiber): void {
  let parent = fiber.return;
  while (parent !== null) {
    if (isFragmentInstanceParent(parent)) {
      const fragmentInstance: FragmentInstanceType = parent.stateNode;
      commitNewChildToFragmentInstance(fiber.stateNode, fragmentInstance);
    }

    if (isHostParent(parent)) {
      return;
    }

    parent = parent.return;
  }
}

// 递归遍历父级Fragment，移除事件监听和节点
export function commitFragmentInstanceDeletionEffects(fiber: Fiber): void {
  let parent = fiber.return;
  while (parent !== null) {
    // 如果父级也是Fragment
    if (isFragmentInstanceParent(parent)) {
      const fragmentInstance: FragmentInstanceType = parent.stateNode;
      // 清理事件和移除实例
      deleteChildFromFragmentInstance(fiber.stateNode, fragmentInstance);
    }
    // 如果到了真实节点就退出
    if (isHostParent(parent)) {
      return;
    }
    // 向上遍历
    parent = parent.return;
  }
}

function isHostParent(fiber: Fiber): boolean {
  return (
    fiber.tag === HostComponent ||
    fiber.tag === HostRoot ||
    // $FlowFixMe[constant-condition]
    (supportsResources ? fiber.tag === HostHoistable : false) ||
    // $FlowFixMe[constant-condition]
    (supportsSingletons
      ? fiber.tag === HostSingleton && isSingletonScope(fiber.type)
      : false) ||
    fiber.tag === HostPortal
  );
}

// 检查是不是Fragment 并且有实例
function isFragmentInstanceParent(fiber: Fiber): boolean {
  return fiber && fiber.tag === Fragment && fiber.stateNode !== null;
}

function getHostSibling(fiber: Fiber): ?Instance {
  // We're going to search forward into the tree until we find a sibling host
  // node. Unfortunately, if multiple insertions are done in a row we have to
  // search past them. This leads to exponential search for the next sibling.
  // TODO: Find a more efficient way to do this.
  let node: Fiber = fiber;
  siblings: while (true) {
    // If we didn't find anything, let's try the next sibling.
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        // If we pop out of the root or hit the parent the fiber we are the
        // last sibling.
        return null;
      }
      // $FlowFixMe[incompatible-type] found when upgrading Flow
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
    while (
      node.tag !== HostComponent &&
      node.tag !== HostText &&
      node.tag !== DehydratedFragment
    ) {
      // If this is a host singleton we go deeper if it's not a special
      // singleton scope. If it is a singleton scope we skip over it because
      // you only insert against this scope when you are already inside of it
      if (
        // $FlowFixMe[constant-condition]
        supportsSingletons &&
        node.tag === HostSingleton &&
        isSingletonScope(node.type)
      ) {
        continue siblings;
      }

      // If it is not host node and, we might have a host node inside it.
      // Try to search down until we find one.
      if (node.flags & Placement) {
        // If we don't have a child, try the siblings instead.
        continue siblings;
      }
      // If we don't have a child, try the siblings instead.
      // We also skip portals because they are not part of this host tree.
      if (node.child === null || node.tag === HostPortal) {
        continue siblings;
      } else {
        node.child.return = node;
        node = node.child;
      }
    }
    // Check if this host node is stable or about to be placed.
    if (!(node.flags & Placement)) {
      // Found it!
      return node.stateNode;
    }
  }
}

// 和insertOrAppendPlacementNode不同的是这个函数父级在挂载容器里插入节点
function insertOrAppendPlacementNodeIntoContainer(
  node: Fiber,
  before: ?Instance,
  parent: Container,
  parentFragmentInstances: null | Array<FragmentInstanceType>,
): void {
  const {tag} = node;
  // 是否是普通dom节点
  const isHost = tag === HostComponent || tag === HostText;
  if (isHost) {
    const stateNode = node.stateNode;
    // 插入容器 区别就是有没有before节点的问题
    if (before) {
      insertInContainerBefore(parent, stateNode, before);
    } else {
      appendChildToContainer(parent, stateNode);
    }
    // 如果支持fragmentref
    if (enableFragmentRefs) {
      // 日常监听事件，保证行为统一
      commitNewChildToFragmentInstances(node, parentFragmentInstances);
    }
    // 标记在ViewTransation过程中有dom修改
    trackHostMutation();
    return;
  } else if (tag === HostPortal) {
    // If the insertion itself is a portal, then we don't want to traverse
    // down its children. Instead, we'll get insertions from each child in
    // the portal directly.
    return;
  }
  // head节点调整父级节点
  if (
    // $FlowFixMe[constant-condition]
    (supportsSingletons ? tag === HostSingleton : false) &&
    isSingletonScope(node.type)
  ) {
    // This singleton is the parent of deeper nodes and needs to become
    // the parent for child insertions and appends
    parent = node.stateNode;
    before = null;
  }

  const child = node.child;
  // 对子节点进行递归处理
  if (child !== null) {
    insertOrAppendPlacementNodeIntoContainer(
      child,
      before,
      parent,
      parentFragmentInstances,
    );
    let sibling = child.sibling;
    while (sibling !== null) {
      insertOrAppendPlacementNodeIntoContainer(
        sibling,
        before,
        parent,
        parentFragmentInstances,
      );
      sibling = sibling.sibling;
    }
  }
}

// 将node节点插入到父级实例里，并且同步绑定事件给所有fragment
// 对于node节点的所有子节点也进行同样的处理
function insertOrAppendPlacementNode(
  // 要插入的fiber节点
  node: Fiber,
  // 在哪个节点之前插入
  before: ?Instance,
  // 父级实例
  parent: Instance,
  // 父级的Fragment实例
  parentFragmentInstances: null | Array<FragmentInstanceType>,
): void {
  // 插入节点类型
  const {tag} = node;
  // 如果是dom节点或者文本节点
  const isHost = tag === HostComponent || tag === HostText;
  if (isHost) {
    // 获取节点的dom实例
    const stateNode = node.stateNode;
    // 如果有before就说明要插入到before前面
    if (before) {
      insertBefore(parent, stateNode, before);
    } else {
      // 父级节点调用appendChild就可以了
      appendChild(parent, stateNode);
    }
    // 如果支持fragment的ref的话
    if (enableFragmentRefs) {
      // 就同步frament的事件处理，以保持行为一致 对子节点进行事件监听
      commitNewChildToFragmentInstances(node, parentFragmentInstances);
    }
    // 标记ViewTransition子树发生了DOM 变更
    trackHostMutation();
    return;
    // portal节点忽略
  } else if (tag === HostPortal) {
    // If the insertion itself is a portal, then we don't want to traverse
    // down its children. Instead, we'll get insertions from each child in
    // the portal directly.
    return;
  }

  if (
    // $FlowFixMe[constant-condition]
    // 如果是特殊父节点，并且是head节点
    (supportsSingletons ? tag === HostSingleton : false) &&
    isSingletonScope(node.type)
  ) {
    // This singleton is the parent of deeper nodes and needs to become
    // the parent for child insertions and appends
    // 切换父级为head节点
    parent = node.stateNode;
  }
  // 获取节点的字节点
  // 递归处理node节点的所有子节点
  const child = node.child;
  if (child !== null) {
    // 递归调用自身插入节点
    insertOrAppendPlacementNode(child, before, parent, parentFragmentInstances);
    // 获取兄弟节点
    let sibling = child.sibling;
    while (sibling !== null) {
      // 插入兄弟节点
      insertOrAppendPlacementNode(
        sibling,
        before,
        parent,
        parentFragmentInstances,
      );
      // 继续下一位兄弟
      sibling = sibling.sibling;
    }
  }
}

// 提交节点插入 流程：
// 找一个有效的父级节点，保存所有父级的fragment实例
// 同步监听节点节点，以便和fragment元素同步
// 根据父级节点是head，普通dom，挂载容器的不容，执行不同的插入函数
function commitPlacement(finishedWork: Fiber): void {
  // Recursively insert all host nodes into the parent.
  let hostParentFiber;
  let parentFragmentInstances = null;
  // 获取父级节点
  let parentFiber = finishedWork.return;
  // 向上遍历找到一个真实dom节点
  while (parentFiber !== null) {
    // 父级如果是Fragment元素
    if (enableFragmentRefs && isFragmentInstanceParent(parentFiber)) {
      const fragmentInstance: FragmentInstanceType = parentFiber.stateNode;
      // 将Fragment实例暂存一下
      if (parentFragmentInstances === null) {
        parentFragmentInstances = [fragmentInstance];
      } else {
        parentFragmentInstances.push(fragmentInstance);
      }
    }
    // 如果是dom节点
    if (isHostParent(parentFiber)) {
      // 保存父级
      hostParentFiber = parentFiber;
      break;
    }
    // 向上遍历
    parentFiber = parentFiber.return;
  }

  // $FlowFixMe[constant-condition]
  // 当前渲染器是否支持直接修改已经存在的宿主节点
  // 如果不支持直接修改
  if (!supportsMutation) {
    // 开启了Fragment ref
    if (enableFragmentRefs) {
      // 在父级Fragment节点上同步处理事件行为，和新增节点统一行为
      commitImmutablePlacementNodeToFragmentInstances(
        finishedWork,
        parentFragmentInstances,
      );
    }
    return;
  }

  if (hostParentFiber == null) {
    throw new Error(
      'Expected to find a host parent. This error is likely caused by a bug ' +
        'in React. Please file an issue.',
    );
  }
  // 根据实际挂在的父级节点进行更新
  switch (hostParentFiber.tag) {
    // 特殊根节点
    case HostSingleton: {
      // $FlowFixMe[constant-condition]
      if (supportsSingletons) {
        // 获取dom实例
        const parent: Instance = hostParentFiber.stateNode;
        // 获取一个有效的兄弟节点 将要插到这个节点前面
        const before = getHostSibling(finishedWork);
        // We only have the top Fiber that was inserted but we need to recurse down its
        // children to find all the terminal nodes.
        // 在parent里插入finishedWork节点 处理所有fragment的事件绑定。即监听finishedwork节点
        insertOrAppendPlacementNode(
          finishedWork,
          before,
          parent,
          parentFragmentInstances,
        );
        break;
      }
      // Fall through
    }
    // 常规dom节点
    case HostComponent: {
      // 获取父级节点实例
      const parent: Instance = hostParentFiber.stateNode;
      // 有清空文本任务
      if (hostParentFiber.flags & ContentReset) {
        // Reset the text content of the parent before doing any insertions
        // 清空文本节点内容
        resetTextContent(parent);
        // Clear ContentReset from the effect tag
        // 剔除任务标记
        hostParentFiber.flags &= ~ContentReset;
      }
      // 获取有效兄弟节点
      const before = getHostSibling(finishedWork);
      // We only have the top Fiber that was inserted but we need to recurse down its
      // children to find all the terminal nodes.
      // 在parent里插入finishedWork节点 处理所有fragment的事件绑定。即监听finishedwork节点
      insertOrAppendPlacementNode(
        finishedWork,
        before,
        parent,
        parentFragmentInstances,
      );
      break;
    }
    // 根节点或者portal节点
    case HostRoot:
    case HostPortal: {
      // 获取挂载容器
      const parent: Container = hostParentFiber.stateNode.containerInfo;
      // 获取节点的兄弟节点
      const before = getHostSibling(finishedWork);
      // 在容器中插入节点
      insertOrAppendPlacementNodeIntoContainer(
        finishedWork,
        before,
        parent,
        parentFragmentInstances,
      );
      break;
    }
    default:
      throw new Error(
        'Invalid host parent fiber. This error is likely caused by a bug ' +
          'in React. Please file an issue.',
      );
  }
}

// 处理父级上的Fragment更新
function commitImmutablePlacementNodeToFragmentInstances(
  finishedWork: Fiber,
  parentFragmentInstances: null | Array<FragmentInstanceType>,
): void {
  if (!enableFragmentRefs) {
    return;
  }
  // 如果是真实dom节点
  const isHost = finishedWork.tag === HostComponent;
  if (isHost) {
    commitNewChildToFragmentInstances(finishedWork, parentFragmentInstances);
    return;
  // portal节点不处理
  } else if (finishedWork.tag === HostPortal) {
    // If the insertion itself is a portal, then we don't want to traverse
    // down its children. Instead, we'll get insertions from each child in
    // the portal directly.
    return;
  }

  const child = finishedWork.child;
  if (child !== null) {
    commitImmutablePlacementNodeToFragmentInstances(
      child,
      parentFragmentInstances,
    );
    let sibling = child.sibling;
    while (sibling !== null) {
      commitImmutablePlacementNodeToFragmentInstances(
        sibling,
        parentFragmentInstances,
      );
      sibling = sibling.sibling;
    }
  }
}

// 提交节点插入
export function commitHostPlacement(finishedWork: Fiber) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, commitPlacement, finishedWork);
    } else {
      // 提交插入节点
      commitPlacement(finishedWork);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}

// 从host里移除parentContainer 移除dom子节点
export function commitHostRemoveChildFromContainer(
  deletedFiber: Fiber,
  nearestMountedAncestor: Fiber,
  parentContainer: Container,
  hostInstance: Instance | TextInstance,
) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(
        deletedFiber,
        removeChildFromContainer,
        parentContainer,
        hostInstance,
      );
    } else {
      removeChildFromContainer(parentContainer, hostInstance);
    }
    trackHostMutation();
  } catch (error) {
    captureCommitPhaseError(deletedFiber, nearestMountedAncestor, error);
  }
}

// 移除子节点removeChild
export function commitHostRemoveChild(
  deletedFiber: Fiber,
  nearestMountedAncestor: Fiber,
  parentInstance: Instance,
  hostInstance: Instance | TextInstance,
) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(
        deletedFiber,
        removeChild,
        parentInstance,
        hostInstance,
      );
    } else {
      removeChild(parentInstance, hostInstance);
    }
    trackHostMutation();
  } catch (error) {
    captureCommitPhaseError(deletedFiber, nearestMountedAncestor, error);
  }
}

export function commitHostRootContainerChildren(
  root: FiberRoot,
  finishedWork: Fiber,
) {
  const containerInfo = root.containerInfo;
  const pendingChildren = root.pendingChildren;
  try {
    if (__DEV__) {
      runWithFiberInDEV(
        finishedWork,
        replaceContainerChildren,
        containerInfo,
        pendingChildren,
      );
    } else {
      replaceContainerChildren(containerInfo, pendingChildren);
    }
    trackHostMutation();
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}

// 更新children节点
export function commitHostPortalContainerChildren(
  portal: {
    containerInfo: Container,
    pendingChildren: ChildSet,
    ...
  },
  finishedWork: Fiber,
  pendingChildren: ChildSet,
) {
  const containerInfo = portal.containerInfo;
  try {
    if (__DEV__) {
      runWithFiberInDEV(
        finishedWork,
        replaceContainerChildren,
        containerInfo,
        pendingChildren,
      );
    } else {
      replaceContainerChildren(containerInfo, pendingChildren);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}

export function commitHostHydratedContainer(
  root: FiberRoot,
  finishedWork: Fiber,
) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(
        finishedWork,
        commitHydratedContainer,
        root.containerInfo,
      );
    } else {
      commitHydratedContainer(root.containerInfo);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}

export function commitHostHydratedActivity(
  activityInstance: ActivityInstance,
  finishedWork: Fiber,
) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(
        finishedWork,
        commitHydratedActivityInstance,
        activityInstance,
      );
    } else {
      commitHydratedActivityInstance(activityInstance);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}

export function commitHostHydratedSuspense(
  suspenseInstance: SuspenseInstance,
  finishedWork: Fiber,
) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(
        finishedWork,
        commitHydratedSuspenseInstance,
        suspenseInstance,
      );
    } else {
      commitHydratedSuspenseInstance(suspenseInstance);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}

export function commitHostSingletonAcquisition(finishedWork: Fiber) {
  const singleton = finishedWork.stateNode;
  const props = finishedWork.memoizedProps;

  try {
    // This was a new mount, acquire the DOM instance and set initial properties
    if (__DEV__) {
      runWithFiberInDEV(
        finishedWork,
        acquireSingletonInstance,
        finishedWork.type,
        props,
        singleton,
        finishedWork,
      );
    } else {
      acquireSingletonInstance(
        finishedWork.type,
        props,
        singleton,
        finishedWork,
      );
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}

// 释放对象清理属性
export function commitHostSingletonRelease(releasingWork: Fiber) {
  if (__DEV__) {
    runWithFiberInDEV(
      releasingWork,
      releaseSingletonInstance,
      releasingWork.stateNode,
    );
  } else {
    releaseSingletonInstance(releasingWork.stateNode);
  }
}
