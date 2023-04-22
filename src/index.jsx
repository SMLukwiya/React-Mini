import DummyReact from "./library";

// Telling babel to use our Dummy React instead of react (Parcel uses babel/core under the hood)
/**@jsx DummyReact.createElement */
const container = document.getElementById("root");

const updateValue = e => {
  rerender(e.target.value)
}

const rerender = (value) => {
  const element = (
    <div>
      <input onInput={updateValue} value={value} />
      <h2>Hello {value}</h2>
    </div>
  )
  DummyReact.render(element, container);
}

rerender("World")