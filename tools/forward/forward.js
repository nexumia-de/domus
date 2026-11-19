// The worker behind an app's earlier address: answers every request with a
// permanent redirect to the same path under the app's folder at the one
// address (docs/deployment.md). TARGET comes from the worker's configuration.
export default {
  fetch(request, env) {
    const { pathname, search } = new URL(request.url);
    return Response.redirect(`${env.TARGET}${pathname}${search}`, 301);
  },
};
