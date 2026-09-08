import { loadDevMessages, loadErrorMessages } from "@apollo/client/dev";

// Apollo Client 4 ships error messages as an opt-in bundle; load them outside production only.
if (process.env.NODE_ENV === "development") {
  loadDevMessages();
  loadErrorMessages();
}
