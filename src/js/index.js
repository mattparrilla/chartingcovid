import router, { initRouter } from './routes';

window.addEventListener("DOMContentLoaded", () => {
  initRouter();
  router.navigateTo(window.location.pathname);
});
