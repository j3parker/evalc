var RAM_CODE    = 0x01,
    RAM_STACK   = 0x02,
    RAM_HEAP    = 0x04,
    RAM_UNALLOC = 0x08
    RAM_UNINIT  = 0x10;

function make_vm(ramsize) {
  if(typeof ramsize == "undefined" || !isFinite(ramsize)) return null;
  var vm = new Object();
  vm.regs = new Uint32Array(32),
  vm.pc = 0;
  vm.hi = 0;
  vm.lo = 0;
  vm.RAM = new Uint32Array(ramsize);
  vm.RAMState = new Uint8Array(ramsize);
  vm.config = new Object();
  vm.config.faultOnCodeW =        true;
  vm.config.faultOnCodeR =        true;
  vm.config.faultOnUnallocR =     true;
  vm.config.faultOnUnallocW =     false;
  vm.config.faultOnUninitR =      true;
  vm.config.faultOnPCEscape =     true;
  vm.config.heapAllocOnUnallocW = true;
  for(var i = 0; i < ramsize; i++) {
    vm.RAMState[i] = RAM_UNALLOC;
  }
  return vm;
}

function make_RAM_table(vm, target) {
  var html = '';
  for(var i = vm.RAM.length - 1; i >= 0; i--) {
    hex = (i*4).toString(16);
    html += '<tr id="' + hex + '"><th class="RAM">0x' + hex + '</th><td class="RAM" id="unalloc"></td></tr>';
  }
  target.innerHTML = html;
}

function make_reg_table(vm, target) {
  var html = '';
  for(var i = vm.regs.length - 1; i >= 0; i--) {
    html += '<tr id="r' + i + '"><th class="reg">$' + i + '</th><td class="reg"></td></tr>';
  }
  target.innerHTML = html;
}

function stateToId(x) {
  if(x & RAM_CODE)    return "code";
  if(x & RAM_STACK)   return "stack";
  if(x & RAM_HEAP)    return "heap";
  if(x & RAM_UNALLOC) return "unalloc";
  return '';
}

function tohex(n) {
  var hex = n.toString(16);
  while(hex.length < 8) {
    hex = "0" + hex;
  }
  return "0x" + hex;
}

function update_ram(vm, x) {
  var hex = x.toString(16);
  var disphex = (x*4).toString(16);
  var row = document.getElementById(disphex);
  if(row == null) return;
  var state = vm.RAMState[x];
  var here = vm.pc == x;
  var val;
  if(state & RAM_CODE) val = disasm(vm.RAM[x]);
  else val = tohex(vm.RAM[x]);
  row.innerHTML = '<th class="RAM"' + (here? 'id="here"':'') + '>0x' + disphex + '</th><td class="RAM" id="' + stateToId(state) + '">' + (((state & RAM_UNINIT) || (state & RAM_UNALLOC)) ? '' : val) + '</td>';
}

function update_reg(vm, x) {
  var row = document.getElementById("r" + x);
  if(row == null) return;
  row.innerHTML = '<th class="reg">$' + x + '</th><td class="reg">' + tohex(vm.regs[x]) + '</td>';
}

function program_ram(vm, loc, op) {
  vm.RAM[loc] = op;
  vm.RAMState[loc] = RAM_CODE;
}

function tcx_to_untyped(tcx, x) {
  /* sorry */
  return ((tcx + Math.pow(2, x-1)) % Math.pow(2, x)) - Math.pow(2, x-1);
}

function tc32_to_untyped(tc32) {
  return tcx_to_untyped(tc32, 32);
}

function tc16_to_untyped(tc16) {
  return tcx_to_untyped(tc16, 16);
}

function step(vm) {
  var oldpc = vm.pc;
  function rs(x)     { return (x&0x3E00000)>>>21; }
  function rt(x)     { return (x&0x1F0000)>>>16; }
  function rd(x)     { return (x&0xF800)>>>11; }
  function imm(x)    { return tc16_to_untyped(x&0xFFFF); }
  function h(x)      { return (x&0x7C0)>>>6; }
  function target(x) { return (x&0x3FFFFFF); }
  function opcode(x) { return (x&0xFC000000)>>>26; }
  function funct(x)  { return (x&0x3F); }
  if(vm.config.faultOnPCEscape && !(vm.RAMState[vm.pc] & RAM_CODE)) 
    throw {
            PC: vm.pc,
            message: "PC at non-code location.",
            fatal: true,
    };
  if(vm.config.faultOnUnallocR && (vm.RAMState[vm.pc] & RAM_UNALLOC))
    throw {
            PC: vm.pc,
            message: "Attempted to load instruction from unallocated memory.",
            fatal: true,
    };
  if(loc >= vm.RAM.length) throw {
                            PC: vm.pc,
                            message: "Attmpted to load code from non-existant memory at location " + loc.toString(16) + ".",
                            fatal: true,
                          }
  var data, loc;
  var write_mem = false;
  instr = vm.RAM[vm.pc];
  switch(opcode(instr)) {
    case opARITH:
      switch(funct(instr)) {
        case opADD:
        case opADDU: vm.regs[rd(instr)] = vm.regs[rs(instr)] + vm.regs[rt(instr)]; break;
        case opAND: vm.regs[rd(instr)] = vm.regs[rs(instr)] & vm.regs[rt(instr)]; break;
        case opDIV:
        case opDIVU:
          vm.lo = Math.floor(vm.regs[rs(instr)] / vm.regs[rt(instr)]) & 0xFFFFFFFF;
          vm.hi = Math.floor(vm.regs[rs(instr)] % vm.regs[rt(instr)]) & 0xFFFFFFFF;
          w
          break;
        case opJR: vm.pc = vm.regs[rs(instr)] - 1; break; // TODO: ???
        case opMFHI: vm.regs[rd(instr)] = vm.hi; break;
        case opMFLO: vm.regs[rd(instr)] = vm.lo; break;
        case opMULT:
          /* more disgusting */
          vm.hi = Math.floor((tc32_to_untyped(vm.regs[rs(instr)]) * tc32_to_untyped(vm.regs[rt(instr)]))
                    / Math.pow(2, 32)) & 0xFFFFFFFF;
          vm.lo = (tc32_to_untyped(vm.regs[rs(instr)]) * tc32_to_untyped(vm.regs[rt(instr)])) & 0xFFFFFFFF;
          break;
        case opMULTU:
          /* disgusting */
          vm.hi = Math.floor((vm.regs[rs(instr)] * vm.regs[rt(instr)]) / Math.pow(2, 32)) & 0xFFFFFFFF;
          vm.lo = (vm.regs[rs(instr)] * vm.regs[rt(instr)]) & 0xFFFFFFFF;
          break;
        case opNOOP:  break;
        case opOR: vm.regs[rd(instr)] = vm.regs[rs(instr)] | vm.regs[rt(instr)]; break;
        case opSLL: vm.regs[rd(instr)] = vm.regs[rt(instr)] << h(instr); break;
        case opSLLV: vm.regs[rd(instr)] = vm.regs[rt(instr)] << vm.regs[rs(instr)]; break;
        case opSLT:
          vm.regs[rd(instr)] =
            tc32_to_untyped(vm.regs[rs(instr)]) < tc32_to_untyped(vm.regs[rt(instr)]);
          break;
        case opSLTU: vm.regs[rd(instr)] = vm.regs[rs(instr)] < vm.regs[rt(instr)]; break;
        case opSRA: vm.regs[rd(instr)] = vm.regs[rt(instr)] >> h(instr); break;
        case opSRL: vm.regs[rd(instr)] = vm.regs[rt(instr)] >>> h(instr); break;
        case opSRLV: vm.regs[rd(instr)] = vm.regs[rt(instr)] >>> vm.regs[rs(instr)]; break;
        case opSUB:
          vm.regs[rd(instr)] =
            tc32_to_untyped(vm.regs[rs(instr)]) - tc32_to_untyped(vm.regs[rt(instr)]);
          break;
        case opSUBU: vm.regs[rd(instr)] = vm.regs[rs(instr)] - vm.regs[rt(instr)]; break;
        case opSYSCALL:
          /* assume exception handler at 0x80 */
          vm.pc = 0x80/4 - 1;
          break;
        case opXOR: vm.regs[rd(instr)] = vm.regs[rs(instr)] ^ vm.regs[rt(instr)]; break;
        default:
          throw {
            PC: vm.pc,
            op: instr,
            message: "Invalid function code for arithmetic operation.",
            fatal: true,
          }
      }
      break;
    case opBRANCH:
      switch(rt(instr)) {
        case opBGEZ: if(tc32_to_untyped(vm.regs[rs(instr)]) >= 0) vm.pc = imm(instr); break;
        case opBGEZAL: break;
        case opBLTZ: break;
        case opBLTZAL: break;
        default: throw {
                   PC: vm.pc,
                   message: "Invalid branch-like opcode.",
                   fatal: true,
                 }
      }
      break;
    case opADDI:
      /* eww */
      vm.regs[rt(instr)] =
        tc32_to_untyped(vm.regs[rs(instr)]) + tc32_to_untyped(imm(instr));
      break;
    case opADDIU: vm.regs[rt(instr)] = vm.regs[rs(instr)] + imm(instr); break;
    case opANDI: vm.regs[rt(instr)] = vm.regs[rs(instr)] & imm(instr); break;
    case opBEQ: if(vm.regs[rs(instr)] == vm.regs[rt(instr)]) vm.pc = imm(instr); break;
    case opBGTZ: if(tc32_to_untyped(vm.regs[rs(instr)]) > 0) vm.pc = imm(instr); break;
    case opBLEZ: if(tc32_to_untyped(vm.regs[rs(instr)]) < 0) vm.pc = imm(instr); break;
    case opBNE: if(vm.regs[rs(instr)] != vm.regs[rt(instr)]) vm.pc = imm(instr); break;
    case opJ: vm.pc = (vm.pc & 0xF0000000) | (target(instr)/4 - 1); break; // TODO
    case opJAL:
      vm.regs[31] = vm.pc + 1;
      vm.pc = (vm.pc & 0xF0000000) | target(instr);
    case opLB:
    case opLUI: vm.regs[rt(instr)] = imm(instr) << 16; break;
    case opLW:
      var offset = imm(instr);
      if(offeset%4 != 0) throw {
                           PC: vm.pc,
                           message: "Unaligned word read.",
                           fatal: true,
                         }
      loc = rs(instr)+imm(instr)/4;
      if(loc >= vm.RAM.length) throw {
                                 PC: vm.pc,
                                 message: "Attmpted to read from non-existant memory at location " + loc.toString(16) + ".",
                                 fatal: true,
                               }
      vm.regs[rt(instr)] = vm.RAM[loc];
      break;
    case opORI:
    case opSB:
    case opSLTI:
    case opSLTIU:
    case opSW:
      var offset = imm(instr);
      if(offset%4 != 0) throw {
                          PC: vm.pc,
                          message: "Unaligned word store.",
                          fatal: true,
                        }
      loc = vm.regs[rs(instr)] + offset/4;
      data = vm.regs[rt(instr)];
      write_mem = true;
      break;
    case opXORI:
    default:
      throw {
        PC: vm.pc,
        message: "Invalid opcode: " + opcode(instr).toString(16) + ".",
        fatal: true,
      }
  }
  vm.regs[0] = 0;
  vm.pc += 1;
  update_ram(vm, oldpc);
  update_ram(vm, vm.pc);
  if(write_mem) {
    if(loc >= vm.RAM.length) throw {
                               PC: vm.pc,
                               message: "Attmpted to write to non-existant memory at location " + loc.toString(16) + ".",
                               fatal: true,
                             }
    if(vm.RAMState[loc] & RAM_UNALLOC && vm.config.faultOnUnallocW)
      throw {
        PC: vm.pc,
        message: "Attempted write to unallocated memory",
        fatal: true,
      }
    if(vm.RAMState[loc] & RAM_CODE && vm.config.faultOnCodeW)
      throw {
        PC: vm.pc,
        message: "Attempted write to protected code location.",
        fatal: true,
      }
    if((vm.RAMState[loc] & RAM_UNALLOC) && vm.config.heapAllocOnUnallocW)
      vm.RAMState[loc] = RAM_HEAP;

    vm.RAM[loc] = data;
    update_ram(vm, loc);
  }
  for(var i=0;i<vm.regs.length;i++) {
    update_reg(vm, i);
  }
}
