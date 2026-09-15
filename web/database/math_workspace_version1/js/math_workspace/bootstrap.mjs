// A single classic bundle is also the direct-file entry point.
import {startWorkspace} from './app.mjs';
import {runBrowserTests} from './editors/browser-test.mjs';
Promise.resolve(window.MathJax?.startup?.promise).then(()=>document.documentElement.hasAttribute('data-workspace-tests')?runBrowserTests():startWorkspace()).catch(error=>{
  const status=document.getElementById('status');status.textContent=`Workspace could not start: ${error.message}`;
  const notice=document.getElementById('startup-notice');if(notice){notice.textContent=`Workspace could not start / 工作区无法启动: ${error.message}`;notice.setAttribute('role','alert');}
  const box=document.getElementById('diagnostics');box.hidden=false;box.open=true;
  document.getElementById('error-detail').textContent=error.stack||String(error);
});
