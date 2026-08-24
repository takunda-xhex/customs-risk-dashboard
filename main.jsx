import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, fontFamily: "monospace", color: "#B23A34", background: "#EDE6D6", minHeight: "100vh" }}>
          <h2>App crashed</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{String(this.state.error && this.state.error.stack || this.state.error)}</p>
          <p style={{ whiteSpace: "pre-wrap", opacity: 0.7 }}>{this.state.info && this.state.info.componentStack}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

window.addEventListener("error", (e) => {
  const el = document.getElementById("root");
  if (el && !el.innerHTML) {
    el.innerHTML = `<pre style="padding:20px;font-family:monospace;color:#B23A34;background:#EDE6D6;white-space:pre-wrap;">Uncaught error: ${e.message}\n${e.filename}:${e.lineno}:${e.colno}</pre>`;
  }
});

try {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (err) {
  document.getElementById("root").innerHTML = `<pre style="padding:20px;font-family:monospace;color:#B23A34;background:#EDE6D6;white-space:pre-wrap;">Render crashed: ${err.stack || err}</pre>`;
}
