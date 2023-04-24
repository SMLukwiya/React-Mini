// DUMMY REACT
// Super minimum react library from scratch

function createElement(type, props, ...children) {
    return {
      type,
      props: {
        ...props,
        children: children.map((child) => {
          return typeof child === "object" ? child : createTextElement(child);
        }),
      },
    };
  }
  
function createTextElement(text) {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue: text,
            children: [],
        },
    };
}

function createDomNode(fiber) {
    const domNode = fiber.type === "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(fiber.type)
    updateDomNode(domNode, {}, fiber.props)
    return domNode
}
  
let nextUnitOfWork = null
let workInProgressRoot = null
let currentRoot = null // will be reference to the previous committed fiber tree
let deletions = null // store dom nodes to be deleted
let workInProgressFiber = null
let hooksIndex = null

  // Render from React Dom
function render(element, container) {
    // set up root node to start work
    workInProgressRoot = {
        domNode: container,
        props: {
            children: [element]
        },
        alternate: currentRoot
    }
    // start with fresh deletions array
    deletions = []
    nextUnitOfWork = workInProgressRoot
  }

  function workLoop(deadline) {
    let shouldYield = false
    while(nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
        shouldYield = deadline.timeRemaining() < 1
    }

    // all work in on the fiber tree is complete
    if (!nextUnitOfWork && workInProgressRoot) {
        commitRoot()
    }
    // from browser env https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
    requestIdleCallback(workLoop)
  }

//  start loop with permission from main thread
  requestIdleCallback(workLoop)


function performUnitOfWork(fiber) {
    // check for functional component
    const isAFunctionalComponent = fiber.type instanceof Function

    if (isAFunctionalComponent) {
        updateFunctionalComponent(fiber)
    } else {
        updateHostComponent(fiber)
    }

    if (fiber.child) {
        // return child as next piece of work
        return fiber.child
    }
    let nextFiber = fiber

    while (nextFiber) {
        if (nextFiber.sibling) {
            // return sibling as next piece of work
            return nextFiber.sibling
        }
        // no child && sibling found, go back up the tree to parent
        nextFiber = nextFiber.parent
    }
}

function updateFunctionalComponent(fiber) {
    workInProgressFiber = fiber
    hooksIndex = 0
    workInProgressFiber.hooks = [] // support multiple hooks in the same component

    const children = [fiber.type(fiber.props)]
    reconcileChildrenElements(fiber, children)
}

function updateHostComponent(fiber) {
    if (!fiber.domNode) {
        // create dom node if doesn't exist
        fiber.domNode = createDomNode(fiber)
    }

    const elements = fiber.props.children
    reconcileChildrenElements(fiber, elements)
}

function reconcileChildrenElements(workInProgressFiber, elements) {
    let childIndex = 0
    let oldFiber = workInProgressFiber.alternate && workInProgressFiber.alternate.child // get reference to previous node
    let prevSibling = null

    while (childIndex < elements.length || oldFiber != null) {
    const childElement = elements[childIndex]
    let newFiber = null

    // compare current element and old fiber (node)
    const sameType = oldFiber && childElement && childElement.type === oldFiber.type

    if (sameType) {
        // same type, just update the props of the dom node
        newFiber = {
            type: oldFiber.type,
            props: childElement.props,
            parent: workInProgressFiber,
            domNode: oldFiber.domNode,
            alternate: oldFiber,
            effectTag: "UPDATE"
        }
    }
    
    if (childElement && !sameType) {
        // new element, insert the dom node
        newFiber = {
            type: childElement.type,
            props: childElement.props,
            domNode: null,
            parent: workInProgressFiber,
            alternate: null,
            effectTag: "INSERTION"
        }
    }

    if (oldFiber && !sameType) {
        // !same type, no new element, delete the old dom node
        oldFiber.effectTag = "DELETION"
        deletions.push(oldFiber)
    }

    
    if (oldFiber) {
        oldFiber = oldFiber.sibling
    }

    if (childIndex === 0) {
        // This is the immediate child element
        workInProgressFiber.child = newFiber
    } else if (childElement) {
        // these are siblings of the first child element
        prevSibling.sibling = newFiber
    }
        prevSibling = newFiber
        childIndex++
    }
}

function commitRoot() {
    deletions.forEach(commitWork);
    commitWork(workInProgressRoot.child)
    currentRoot = workInProgressRoot
    workInProgressRoot = null
}

function commitWork(fiber) {
    if (!fiber) {
        return
    };

    let domParentFiber = fiber.parent
    while(!domParentFiber.domNode) {
        domParentFiber = domParentFiber.parent
    }
    
    const domNodeParent = domParentFiber.domNode
    if (fiber.effectTag === "INSERTION" && fiber.domNode !== null)  {
        // only append for new nodes/insertions nodes
        domNodeParent.appendChild(fiber.domNode)
    } else if (fiber.effectTag === "UPDATE" && fiber.domNode !== null) {
        // update dom node
        updateDomNode(fiber.domNode, fiber.alternate.props, fiber.props)
    } else if (fiber.effectTag === "DELETION") {
        // delete outdated nodes
        commitDeletion(fiber, domNodeParent)
    }

    commitWork(fiber.child) // go recursively on child elements first
    commitWork(fiber.sibling) // go recursively on sibling elements next
}

function commitDeletion(fiber, domNodeParent) {
    if (fiber.domNode) {
        document.removeChild(fiber.domNode)
    } else {
        commitDeletion(fiber.child, domNodeParent)
    }
}

function updateDomNode(domNode, prevProps, nextProps) {
    // For event listener props
    const isEvent = key => key.startsWith("on")
    const isAProperty = (key) => key !== "children" && !isEvent(key);
    const isNewProp = (prev, next) => key => prev[key] !== next[key]
    const isRemoved = (prev, next) => key => !(key in next)
    // Remove old event listeners OR change event listeners
    Object.keys(prevProps)
        .filter(isEvent)
        .filter(key => {
            return !(key in nextProps) || isNewProp(prevProps, nextProps)(key)
        })
        .forEach(name => {
            const eventType = name.toLowerCase().substring(2)
            domNode.removeEventListener(eventType, prevProps[name])
        })
    // Add new event listeners
    Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNewProp(prevProps, nextProps))
        .forEach(name => {
            const eventType = name.toLowerCase().substring(2)
            domNode.addEventListener(eventType, nextProps[name])
        })
    // Remove old properties
    Object.keys(prevProps)
        .filter(isAProperty)
        .filter(isRemoved(prevProps, nextProps))
        .forEach(name => {
            domNode[name] = ""
        })

    // Set new Properties
    Object.keys(nextProps)
        .filter(isAProperty)
        .filter(isNewProp(prevProps, nextProps))
        .forEach(name => {
            domNode[name] = nextProps[name]
        })
}

function useState(initialState) {
    const oldHook = workInProgressFiber.alternate
        && workInProgressFiber.alternate.hooks && workInProgressFiber.alternate.hooks[hooksIndex]
    
    const hook = {
        state: oldHook ? oldHook.state : initialState,
        queue: []
    }

    const actions = oldHook ? oldHook.queue : []
    actions.forEach(action => {
        hook.state = action(hook.state)
    })

    const setState = action => {
        hook.queue.push(action)
        // do like in render so workloop starts a new render phase
        workInProgressRoot = {
            domNode: currentRoot.domNode,
            props: currentRoot.props,
            alternate: currentRoot
        }
        nextUnitOfWork = workInProgressRoot
        deletions = []
    }

    workInProgressFiber.hooks.push(hook)
    hooksIndex++
    return [hook.state, setState]
}

// Export our glorious React Dummy
export default DummyReact = {
    createElement,
    render,
    useState
};
