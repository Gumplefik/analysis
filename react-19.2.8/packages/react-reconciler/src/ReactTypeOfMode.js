/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Fiber.mode 使用的位掩码类型；一个 Fiber 可以通过按位或同时开启多个模式。
export type TypeOfMode = number;

// 不启用任何特殊模式，主要用于 Legacy Root。
export const NoMode = /*                         */ 0b0000000;
// TODO: Remove ConcurrentMode by reading from the root tag instead
// 并发模式：允许任务按优先级调度、被中断、恢复或重新渲染。
export const ConcurrentMode = /*                 */ 0b0000001;
// 性能分析模式：记录 Fiber 的 Render、Commit 等阶段耗时，供 Profiler 和 DevTools 使用。
export const ProfileMode = /*                    */ 0b0000010;
// 以前用于调试并发渲染过程，目前已经删除并空出该二进制位。
//export const DebugTracingMode = /*             */ 0b0000100; // Removed
// StrictMode 的传统开发检查：额外调用 Render 等逻辑，帮助发现不安全的副作用和旧 API。
export const StrictLegacyMode = /*               */ 0b0001000;
// StrictMode 的 Effect 开发检查：模拟卸载并重新执行 Effect，检查 Effect 是否能够正确清理。
export const StrictEffectsMode = /*              */ 0b0010000;
// Keep track of if we're in a SuspenseyImages eligible subtree.
// TODO: Remove this when enableSuspenseyImages ship where it's always on.
// 图片暂停模式：允许当前子树等待图片加载或解码后再 Commit，主要用于 ViewTransition 等场景。
export const SuspenseyImagesMode = /*            */ 0b0100000;
