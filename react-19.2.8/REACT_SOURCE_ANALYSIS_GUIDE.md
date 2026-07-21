# React 源码分析指南

> 本文用于指导 React 19.x 源码阅读。核心方法是：不要按照 `packages/` 目录顺序通读，而是选择一个最小示例，沿着一次更新的完整生命周期阅读。

## 0. 先校准源码版本

当前目录名是 `react-19.2.8`，但以下源码文件中的版本号是 **19.3.0**：

- `packages/shared/ReactVersion.js`
- `packages/react/package.json`
- `packages/react-dom/package.json`

因此：

- 如果目的是学习 Fiber、Hooks、调度和提交机制，可以继续使用当前源码。
- 如果目的是精确分析 React 19.2.8 的特性和实现，应重新获取对应 tag 或 source archive，并使用源码中的版本号验证，而不是只依赖目录名。

## 1. 总体阅读思路

阅读了解实现架构
https://incepter.github.io/how-react-works/
https://github.com/acdlite/react-fiber-architecture
https://github.com/koba04/react-fiber-resources
https://inside-react.vercel.app/
https://deepwiki.com/facebook/react


从下面这个生命周期入手：

```text
JSX / createElement
        ↓
React Element
        ↓
createRoot().render()
        ↓
创建并调度 Fiber 更新
        ↓
Render 阶段：构建和比较 Fiber 树
        ↓
Commit 阶段：更新 DOM、执行 Effect
```

第一轮阅读的目标不是理解所有实现细节，而是建立四个稳定的认知模型：

1. React Element 如何变成 Fiber。
2. 更新如何进入队列并获得 Lane。
3. Fiber 树如何在 Render 阶段生成。
4. Fiber Flags 如何在 Commit 阶段转化成 DOM 和 Effect 操作。

## 2. 核心模块地图

先只认识以下几个核心模块：

```text
react
  提供 ReactElement、Hooks 等面向用户的接口
       │
       ▼
react-dom
  浏览器渲染器入口：createRoot、hydrateRoot
       │
       ▼
react-reconciler
  Fiber、更新队列、Hooks、协调、Render/Commit
       │
       ├──────────► scheduler
       │             时间切片、优先级、任务调度
       │
       ▼
react-dom-bindings
  DOM Adapter：创建节点、设置属性、事件、插入和删除
```

各模块的职责如下：

| 模块 | 主要职责 |
| --- | --- |
| `react` | 创建 React Element，提供 Hooks 等公开接口，本身不负责渲染 DOM |
| `react-dom` | 提供浏览器渲染入口，创建 Root，连接 reconciler 和浏览器环境 |
| `react-reconciler` | React 的核心状态机，实现 Fiber、更新队列、协调和提交 |
| `scheduler` | 调度有优先级的任务，判断是否应该让出主线程 |
| `react-dom-bindings` | reconciler 与 DOM 之间的 Adapter，实现具体 DOM 操作和事件处理 |
| `shared` | 多个模块共享的类型、常量和工具函数 |

第一轮可以暂时跳过：

- `react-devtools*`
- `react-native-renderer`
- `react-server-dom-*`
- React Compiler
- Fizz、Flight、SSR
- Activity、View Transition 等新功能

先理解普通客户端渲染，再扩展到这些模块。

## 3. 使用一个最小示例作为阅读锚点

```jsx
function Counter() {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    console.log(count);
  }, [count]);

  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  );
}

createRoot(container).render(<Counter />);
```

围绕这个示例分析两个过程：

1. 首次执行 `root.render()` 时，React 如何创建 DOM。
2. 点击按钮调用 `setCount()` 后，React 如何调度并完成更新。

## 4. 第一条主线：React Element

建议从以下文件开始：

- `packages/react/src/ReactClient.js`
- `packages/react/src/jsx/ReactJSXElement.js`

重点回答：

- JSX 编译后调用了什么函数？
- React Element 包含哪些字段？
- `type`、`key`、`props` 分别有什么作用？
- React Element 和 Fiber 有什么区别？

需要建立的认知是：

- React Element 是对 UI 的轻量描述。
- Fiber 是 React 内部用于保存状态、组织工作和执行调度的节点。
- JSX 不是由 React 运行时直接解析的，它通常已经被编译成 JSX runtime 或 `createElement` 调用。

## 5. 第二条主线：Root 的创建

阅读顺序：

1. `packages/react-dom/client.js`
2. `packages/react-dom/src/client/ReactDOMRoot.js`
3. `packages/react-reconciler/src/ReactFiberReconciler.js`
4. `packages/react-reconciler/src/ReactFiberRoot.js`

主要调用链：

```text
createRoot
→ createContainer
→ createFiberRoot
→ root.render
→ updateContainer
```

重点区分：

- `ReactDOMRoot`：暴露给用户的 Root 对象。
- `FiberRoot`：整个 React 应用根节点的内部状态。
- `HostRoot Fiber`：Fiber 树的根节点。
- `root.current`：当前已经提交并显示在页面上的 Fiber 树。

建议画出下面的关系：

```text
ReactDOMRoot
  └── _internalRoot → FiberRoot
                         └── current → HostRoot Fiber
```

## 6. 第三条主线：更新如何进入调度系统

阅读文件：

- `packages/react-reconciler/src/ReactFiberReconciler.js`
- `packages/react-reconciler/src/ReactFiberClassUpdateQueue.js`
- `packages/react-reconciler/src/ReactFiberWorkLoop.js`
- `packages/react-reconciler/src/ReactFiberRootScheduler.js`

主要调用链：

```text
updateContainer
→ 创建 Update
→ enqueueUpdate
→ scheduleUpdateOnFiber
→ ensureRootIsScheduled
→ 根据 Lane 确定优先级
```

这里先掌握三个概念：

- `Update`：描述一次状态变更。
- `Lane`：用位图表示更新优先级以及更新集合。
- Scheduler Priority：Scheduler 执行任务时使用的优先级。

第一轮不需要记住所有 Lane 常量，应该优先回答：

- 为什么一个 Root 上可以同时存在不同优先级的更新？
- 哪些 Lane 是当前这次 Render 需要处理的？
- 未处理的 Lane 如何保留到后续 Render？
- Lane 和 Scheduler Priority 有什么区别？

## 7. 第四条主线：Render 阶段

核心文件：

- `packages/react-reconciler/src/ReactFiberWorkLoop.js`
- `packages/react-reconciler/src/ReactFiberBeginWork.js`
- `packages/react-reconciler/src/ReactChildFiber.js`
- `packages/react-reconciler/src/ReactFiberCompleteWork.js`

主要调用链：

```text
renderRootConcurrent / renderRootSync
→ workLoop
→ performUnitOfWork
→ beginWork
→ reconcileChildren
→ completeUnitOfWork
→ completeWork
```

可以把每个 Fiber 看作一个带状态的栈帧：

- `beginWork`：处理当前节点，并向下进入子节点。
- `completeWork`：当前子树完成后向上归并结果。
- `child`：第一个子节点。
- `sibling`：下一个兄弟节点。
- `return`：父节点。
- `alternate`：当前树和工作树之间的对应节点。

第一轮只研究三种 Fiber：

- `HostRoot`
- `FunctionComponent`
- `HostComponent`

建议暂时忽略 Suspense、Offscreen、Activity 和 View Transition 等分支。

## 8. 第五条主线：Hooks

核心文件：

- `packages/react/src/ReactHooks.js`
- `packages/react-reconciler/src/ReactFiberHooks.js`

追踪公开 Hook 到内部实现的调用链：

```text
React.useState
→ resolveDispatcher
→ dispatcher.useState
→ mountState / updateState
```

再追踪函数组件的执行过程：

```text
FunctionComponent
→ renderWithHooks
→ 设置当前 Dispatcher
→ 执行用户函数组件
→ Hooks 形成链表
```

重点观察：

- `currentlyRenderingFiber`
- `workInProgressHook`
- `currentHook`
- Hook 的 `memoizedState`
- State Hook 的更新队列
- mount、update、rerender 三类 Dispatcher

完成这一部分后，应该能够从实现层面解释：

- 为什么 Hook 只能在函数组件或自定义 Hook 中调用？
- 为什么 Hook 不能放进条件语句？
- 多个 `useState` 如何与上一次渲染中的状态一一对应？
- `setState` 如何找到需要更新的 Fiber？

## 9. 第六条主线：子节点协调和 Diff

核心文件：

- `packages/react-reconciler/src/ReactChildFiber.js`
- `packages/react-reconciler/src/ReactFiberBeginWork.js`

准备下面几组 children，分别分析 Fiber 是否复用：

```jsx
// 插入
[A, B] → [A, X, B]

// 删除
[A, B, C] → [A, C]

// 移动
[A, B, C] → [C, A, B]

// key 改变
<A key="1" /> → <A key="2" />
```

对每种情况记录：

- Fiber 是否复用？
- `alternate` 是否存在？
- 是否设置了 `Placement`、`Update` 或 `ChildDeletion`？
- `lastPlacedIndex` 如何判断节点移动？
- `key` 和 `type` 如何共同决定节点身份？

不要只背“React Diff 算法”，应结合具体输入观察 Fiber 和 Flags 的变化。

## 10. 第七条主线：Commit 阶段

核心文件：

- `packages/react-reconciler/src/ReactFiberCommitWork.js`
- `packages/react-reconciler/src/ReactFiberCommitHostEffects.js`
- `packages/react-reconciler/src/ReactFiberCommitEffects.js`
- `packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js`

将 Commit 分成三类理解：

| 阶段 | 主要工作 |
| --- | --- |
| Mutation | 插入、删除、更新 DOM |
| Layout | 执行 `useLayoutEffect`、处理 ref 和类组件生命周期 |
| Passive | 调度和执行 `useEffect` |

DOM Adapter 中值得关注的接口：

- `createInstance`
- `appendChild`
- `appendChildToContainer`
- `commitUpdate`
- `removeChild`

这里存在一条重要 seam：

- `react-reconciler` 决定需要做什么。
- `react-dom-bindings` 决定如何在 DOM 环境中执行。

这也是 reconciler 能够支持 DOM、Native 和测试渲染器的基础。

## 11. 第八条主线：Scheduler

核心文件：

- `packages/scheduler/src/forks/Scheduler.js`
- `packages/react-reconciler/src/ReactFiberRootScheduler.js`

主要调用链：

```text
unstable_scheduleCallback
→ taskQueue
→ requestHostCallback
→ performWorkUntilDeadline
→ flushWork
→ workLoop
```

重点回答：

- Scheduler 如何把任务交给宿主环境？
- React 如何判断是否应该让出主线程？
- 一个任务回调为什么可以返回另一个回调？
- Lane 优先级如何映射到 Scheduler 优先级？
- 同步 Render 和并发 Render 的退出条件有什么区别？

Scheduler 建议放在基础 Render/Commit 主线之后阅读。否则容易理解调度细节，却不知道被调度的工作具体是什么。

## 12. 使用测试作为可执行文档

React 的测试通常比实现代码更容易表达行为语义。推荐阅读顺序：

1. `ReactChildReconciler-test`
2. `ReactIncrementalUpdates-test`
3. `ReactHooksWithNoopRenderer-test`
4. `ReactTransition-test`
5. `ReactSuspense-test`

运行单个测试的示例：

```bash
cd react-19.2.8
yarn test ReactIncrementalUpdates --runInBand
```

推荐分析循环：

```text
阅读测试输入
→ 明确预期输出
→ 找到对应实现
→ 添加断点或临时日志
→ 修改测试输入
→ 重新运行并验证推断
```

`react-noop-renderer` 很适合研究 reconciler，因为它排除了真实 DOM、浏览器事件等噪声。

## 13. 四阶段学习路线

### 第一阶段：基础渲染

目标：解释首次执行 `root.render()` 时，React Element 如何最终产生 DOM。

```text
React Element
→ createRoot
→ updateContainer
→ beginWork
→ completeWork
→ commit
```

完成标准：可以画出首次渲染的调用链，并说明 Fiber 树、DOM 树和 React Element 树的区别。

### 第二阶段：状态更新与 Hooks

目标：解释点击按钮后，为什么 React 只更新必要的节点。

```text
dispatchSetState
→ Update Queue
→ Lane
→ scheduleUpdateOnFiber
→ renderWithHooks
→ reconcileChildren
→ bailout
```

完成标准：可以解释 Hook 链表、更新队列、Fiber 复用和 bailout。

### 第三阶段：并发与调度

目标：理解可中断、可恢复、有优先级的渲染，而不只是把并发理解为“异步”。

```text
Lane
→ RootScheduler
→ Scheduler
→ workLoopConcurrent
→ shouldYield
→ 恢复工作
```

完成标准：可以解释 Lane、Scheduler Priority、时间切片和 Render 恢复机制之间的关系。

### 第四阶段：React 19 专题

基础主线完成后，每次选择一个专题：

- Actions、`useActionState`、`useOptimistic`
- `use` 与 Thenable
- Suspense
- Server Components 和 Flight
- SSR、Fizz 与 hydration
- Activity、View Transition
- Effect Event

每个专题都从公开接口开始，追踪到测试、数据结构和具体实现。

## 14. 源码笔记模板

每研究一个流程，只记录以下内容：

```md
## 功能：setState

### 入口

dispatchSetState

### 核心数据

Fiber、Hook、Update、Lane

### 调用链

dispatchSetState → ... → commitRoot

### 不变量

current 与 workInProgress 通过 alternate 对应。

### 验证测试

ReactHooksWithNoopRenderer-test

### 尚未解决的问题

- 这个更新的 Lane 在哪里选择？
- 未处理的更新如何保留？
```

## 15. 阅读时常见的误区

### 按文件顺序通读

React 的核心文件包含大量特性开关和特殊分支。脱离调用链逐行阅读，很容易迷失在细节中。

### 一开始就研究 Concurrent、Suspense 或 Server Components

这些功能建立在 Fiber、Lane、Render 和 Commit 之上。基础模型不稳定时，很难判断复杂分支的目的。

### 把 React Element、Fiber 和 DOM 节点混为一谈

三者分别是 UI 描述、内部工作节点和宿主环境节点。源码阅读时应随时确认当前变量属于哪一层。

### 把 Scheduler Priority 和 Lane 当成同一个概念

Lane 属于 reconciler 的更新模型；Scheduler Priority 属于任务执行模型。二者有关联，但职责不同。

### 只看实现，不运行测试

源码说明“如何实现”，测试通常更直接地说明“应该表现成什么”。应将测试作为可执行文档使用。

## 16. 建议的第一天任务

第一天只完成以下任务：

1. 阅读 `ReactJSXElement.js`，写出 React Element 的主要字段。
2. 从 `createRoot()` 追踪到 `createFiberRoot()`。
3. 画出 `ReactDOMRoot → FiberRoot → HostRoot Fiber` 的关系。
4. 从 `root.render()` 追踪到 `scheduleUpdateOnFiber()`。
5. 暂时在 `beginWork()` 停止，不继续深入。

这一天的成果应该是一张调用链图和一页术语笔记，而不是读完多少行源码。

完成后，第二天再从 `beginWork()` 进入 Function Component、Hooks 和子节点协调。
