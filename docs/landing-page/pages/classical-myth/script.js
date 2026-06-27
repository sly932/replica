/* ============================================================
   Replica 落地页 · 交互（纯原生，零依赖）
   1) 导航滚动加底
   2) 「怎么工作」scroll-spy：右侧分段进视口 → 左侧目录高亮
   3) 邮箱胶囊假提交
   ============================================================ */

// 1) 导航滚动加底色
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// 2) scroll-spy：观察每个 .step，进入视口中部时点亮对应 rail item
const steps = document.querySelectorAll('.how-stream .step');
const railItems = document.querySelectorAll('.how-rail .rail-list li');

const setActive = (step) => {
  railItems.forEach(li => li.classList.toggle('active', li.dataset.step === step));
};

const spy = new IntersectionObserver((entries) => {
  // 取当前与视口中线相交、最靠上的那个 step
  const visible = entries
    .filter(e => e.isIntersecting)
    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
  if (visible[0]) setActive(visible[0].target.dataset.step);
}, {
  // 关注视口中部一条带：上下各留 35%，让"正在阅读"的那段命中
  rootMargin: '-35% 0px -55% 0px',
  threshold: 0,
});
steps.forEach(s => spy.observe(s));

// 3) 邮箱胶囊假提交：演示用，给个轻反馈
function fakeSubmit(form) {
  const input = form.querySelector('input');
  const btn = form.querySelector('button');
  if (!input.value) return false;
  const old = btn.textContent;
  btn.textContent = '已收到 ✓';
  btn.style.opacity = '.7';
  input.value = '';
  setTimeout(() => { btn.textContent = old; btn.style.opacity = ''; }, 1800);
  return false; // 阻止真实提交（demo）
}
window.fakeSubmit = fakeSubmit;

// === faq single-open accordion (appended) ===
document.querySelectorAll('.faq-item').forEach((d) => {
  d.addEventListener('toggle', () => {
    if (d.open) {
      document.querySelectorAll('.faq-item[open]').forEach((o) => { if (o !== d) o.open = false; });
    }
  });
});
