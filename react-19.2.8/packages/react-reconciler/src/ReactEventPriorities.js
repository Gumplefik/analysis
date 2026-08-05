/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Lane, Lanes} from './ReactFiberLane';

import {
  NoLane,
  SyncLane,
  InputContinuousLane,
  DefaultLane,
  IdleLane,
  getHighestPriorityLane,
  includesNonIdleWork,
} from './ReactFiberLane';

export opaque type EventPriority = Lane;

// 当前没有正在处理的事件，不对应任何更新优先级。
export const NoEventPriority: EventPriority = NoLane;
// 离散事件优先级：用于 click、keydown、submit 等需要立即响应的单次用户操作，对应同步 Lane。
export const DiscreteEventPriority: EventPriority = SyncLane;
// 连续事件优先级：用于 mousemove、pointermove、scroll 等连续触发且可合并的用户操作。
export const ContinuousEventPriority: EventPriority = InputContinuousLane;
// 默认事件优先级：用于没有特殊优先级要求的普通事件和更新。
export const DefaultEventPriority: EventPriority = DefaultLane;
// 空闲事件优先级：用于不影响当前交互、可以等浏览器空闲时再处理的后台更新。
export const IdleEventPriority: EventPriority = IdleLane;

export function higherEventPriority(
  a: EventPriority,
  b: EventPriority,
): EventPriority {
  return a !== 0 && a < b ? a : b;
}

export function lowerEventPriority(
  a: EventPriority,
  b: EventPriority,
): EventPriority {
  return a === 0 || a > b ? a : b;
}

export function isHigherEventPriority(
  a: EventPriority,
  b: EventPriority,
): boolean {
  return a !== 0 && a < b;
}

export function eventPriorityToLane(updatePriority: EventPriority): Lane {
  return updatePriority;
}

// 根据任务获取最高优先级
export function lanesToEventPriority(lanes: Lanes): EventPriority {
  const lane = getHighestPriorityLane(lanes);
  if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
    return DiscreteEventPriority;
  }
  if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
    return ContinuousEventPriority;
  }
  if (includesNonIdleWork(lane)) {
    return DefaultEventPriority;
  }
  return IdleEventPriority;
}
