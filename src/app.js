(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let noticeTimer;
  window.NexusNotice = message => {
    $('app-notice').textContent = message;
    $('app-notice').classList.add('visible');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => $('app-notice').classList.remove('visible'), 4500);
  };

  const tabs = [...document.querySelectorAll('[data-chart]')];
  function selectTab(tab, focus = false) {
    tabs.forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      $(item.getAttribute('aria-controls')).hidden = !active;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      const keys = {ArrowRight:(index + 1) % tabs.length, ArrowLeft:(index + tabs.length - 1) % tabs.length, Home:0, End:tabs.length - 1};
      if (keys[event.key] !== undefined) {event.preventDefault(); selectTab(tabs[keys[event.key]], true);}
    });
  });

  const help = $('help-panel');
  let helpOrigin = null;
  function setHelp(open) {
    if (open) helpOrigin = document.activeElement;
    help.hidden = !open;
    $('btn-help').setAttribute('aria-expanded', String(open));
    document.querySelector('.atlas').inert = open;
    if (open) $('btn-help-close').focus();
    else helpOrigin?.focus();
  }
  $('btn-help').addEventListener('click', () => setHelp(help.hidden));
  $('btn-concept').addEventListener('click', () => setHelp(true));
  $('btn-help-close').addEventListener('click', () => setHelp(false));
  help.addEventListener('click', event => {if (event.target === help) setHelp(false);});
  help.addEventListener('keydown', event => {
    if (event.key === 'Tab') {event.preventDefault(); $('btn-help-close').focus();}
  });

  function setCleanView() {
    const active = document.body.classList.toggle('clean-view');
    $('btn-clean-view').setAttribute('aria-pressed', String(active));
    $('btn-clean-view').innerHTML = `${active ? 'Recolher vista' : 'Ampliar vista'} <span class="key">F</span>`;
    window.dispatchEvent(new Event('resize'));
  }
  $('btn-clean-view').addEventListener('click', setCleanView);
  const cameraButtons = ['btn-cam-iso', 'btn-cam-top', 'btn-cam-core'];
  cameraButtons.forEach(id => $(id).addEventListener('click', () => cameraButtons.forEach(other => {
    $(other).setAttribute('aria-pressed', String(other === id));
    $(other).classList.toggle('active', other === id);
  })));

  window.addEventListener('nexus:selection', event => {
    const {id} = event.detail;
    const moduleMap = {'c-obs':'mod-obs','c-hyp':'mod-the','c-val':'mod-val','c-inc':'mod-fal'};
    document.querySelectorAll('.focus-btn').forEach(button => {
      const selected = button.dataset.focus === moduleMap[id];
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    cameraButtons.forEach(button => {$(button).classList.remove('active'); $(button).setAttribute('aria-pressed', 'false');});
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (!help.hidden) setHelp(false);
      else if (document.body.classList.contains('cine-active')) $('btn-cine-stop').click();
      else if (document.body.classList.contains('clean-view')) setCleanView();
      return;
    }
    if (!help.hidden || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,textarea,select,[contenteditable=true]')) return;
    // Space on a focused button keeps its native activation behavior.
    if (event.key === ' ' && !event.target.closest('button,[role=slider],[role=tab]')) {event.preventDefault(); $('btn-toggle-motion').click();}
    if (event.key.toLowerCase() === 'r') $('btn-cam-iso').click();
    if (event.key.toLowerCase() === 'f') setCleanView();
    if (event.key.toLowerCase() === 'l') $('btn-toggle-labels').click();
    if (event.key === '?') setHelp(true);
  });

  $('btn-export').addEventListener('click', async () => {
    const button = $('btn-export');
    button.disabled = true;
    try {
      if (!window.NexusScene || !window.NexusExport) throw new Error('Aguarde o carregamento da cena 3D.');
      await window.NexusExport.downloadPlate();
      window.NexusNotice('Prancha exportada em PNG · 1920 × 1080.');
    } catch (error) {
      window.NexusNotice(error.message || 'Não foi possível exportar a prancha.');
    } finally {button.disabled = false;}
  });
})();
