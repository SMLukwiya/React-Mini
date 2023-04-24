import DummyReact from "./library";

// Telling babel to use our Dummy React instead of react (Parcel uses babel/core under the hood)
/**@jsx DummyReact.createElement */
function App(props) {
  const [state, setState] = DummyReact.useState(1)

  return <h1 onClick={() => setState(count => count + 1)}>Count: {state}</h1>
}

const element = <App name="foo" />
const container = document.getElementById("root")
DummyReact.render(element, container)