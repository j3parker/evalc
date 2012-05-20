function do_step() {
  var dirty = null;
  try { dirty = step(vm, 1); }
  catch (err) {
    if(err.fatal) {
      var out = '<span style="color:#FF3333;">Fatal error: </span>' + err.message;
      term.write("%n%n" + out);
      if(run_handle != null) {
        clearInterval(run_handle);
        run_handle = null;
      }
      document.getElementById('assemble').style.visibility = 'hidden';
      document.getElementById('step').style.visibility = 'hidden';
      document.getElementById('run').style.visibility = 'hidden';
      document.getElementById('reset').style.visibility = 'visible';
      document.getElementById('faster').style.visibility = 'hidden';
      document.getElementById('stop').style.visibility = 'hidden';
    } else {
      throw err;
    }
  }
  for(var i = 0; i < dirty.ram.length; i++) {
    update_ram(vm, dirty.ram[i]);
  }
  for(var i = 0; i < dirty.reg.length; i++) {
    update_reg(vm, dirty.reg[i]);
  }
}

function do_assemble() {
  var asm;
//  try {
    asm = asmtomips(editor.getValue());
  //} catch(err) {
    // log errors here!
    //return;
//  }
  for(var idx=0;idx<asm.length;idx++) {
    program_ram(vm, idx, asm[idx]);
    update_ram(vm, idx);
  }
  document.getElementById('assemble').style.visibility = 'hidden';
  document.getElementById('step').style.visibility = 'visible';
  document.getElementById('run').style.visibility = 'visible';
  document.getElementById('reset').style.visibility = 'visible';
  document.getElementById('faster').style.visibility = 'hidden';
  document.getElementById('stop').style.visibility = 'hidden';
}

function do_reset() {
  vm = make_vm(1024);
  vm.console = con;
  con.flush();
  make_RAM_table(vm, document.getElementById('RAM'));
  term.clear();
  document.getElementById('assemble').style.visibility = 'visible';
  document.getElementById('step').style.visibility = 'hidden';
  document.getElementById('run').style.visibility = 'hidden';
  document.getElementById('reset').style.visibility = 'hidden';
  document.getElementById('faster').style.visibility = 'hidden';
  document.getElementById('stop').style.visibility = 'hidden';
}

var run_handle = null;
var run_length;

function do_run() {
  run_handle = setInterval(do_step, 800);
  run_length = 800;
  document.getElementById('assemble').style.visibility = 'hidden';
  document.getElementById('step').style.visibility = 'hidden';
  document.getElementById('run').style.visibility = 'hidden';
  document.getElementById('reset').style.visibility = 'hidden';
  document.getElementById('faster').style.visibility = 'visible';
  document.getElementById('stop').style.visibility = 'visible';
}

function do_faster() {
  run_length /= 2;
  clearInterval(run_handle);
  run_handle = setInterval(do_step, run_length);
  if(run_length <= 1) document.getElementById('faster').style.visibility = 'hidden';
}

function do_stop() {
  clearInterval(run_handle);
  run_handle = null;
  document.getElementById('assemble').style.visibility = 'hidden';
  document.getElementById('step').style.visibility = 'visible';
  document.getElementById('run').style.visibility = 'visible';
  document.getElementById('reset').style.visibility = 'visible';
  document.getElementById('faster').style.visibility = 'hidden';
  document.getElementById('stop').style.visibility = 'hidden';
}

