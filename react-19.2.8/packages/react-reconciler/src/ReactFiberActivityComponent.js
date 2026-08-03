/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ActivityInstance} from './ReactFiberConfig';
import type {CapturedValue} from './ReactCapturedValue';
import type {Lane} from './ReactFiberLane';
import type {TreeContext} from './ReactFiberTreeContext';

// A non-null ActivityState represents a dehydrated Activity boundary.
export type ActivityState = {
  // 服务端生成的 Activity 边界实例；客户端 Hydration 时通过它定位并复用边界 DOM。
  dehydrated: ActivityInstance,
  // 服务端渲染时保存的树上下文；Hydration 时用于恢复相同的树位置和 useId 生成结果。
  treeContext: null | TreeContext,
  // Represents the lane we should attempt to hydrate a dehydrated boundary at.
  // OffscreenLane is the default for dehydrated boundaries.
  // NoLane is the default for normal boundaries, which turns into "normal" pri.
  // 下一次尝试 Hydration 该 Activity 边界时使用的任务 Lane。
  retryLane: Lane,
  // Stashed Errors that happened while attempting to hydrate this boundary.
  // 尝试 Hydration 该边界时暂存的错误，后续用于恢复处理或上报。
  hydrationErrors: Array<CapturedValue<mixed>> | null,
};
