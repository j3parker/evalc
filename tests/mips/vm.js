"use strict";
var RAM_CODE    = 0x01,
    RAM_STACK   = 0x02,
    RAM_HEAP    = 0x04,
    RAM_UNALLOC = 0x08,
    RAM_UNINIT  = 0x10;

function make_vm(ramsize) {
  var i = 0,
      vm = {
    regs: new Uint32Array(32),
    pc: 0,
    hi: 0,
    lo: 0,
    RAM: new Uint32Array(ramsize),
    RAMState: new Uint8Array(ramsize),
    config: {
      faultOnCodeW:        true,
      faultOnCodeR:        true,
      faultOnUnallocR:     true,
      faultOnUnallocW:     false,
      faultOnUninitR:      true,
      faultOnPCEscape:     true,
      heapAllocOnUnallocW: true
    }
  };
  for(i = 0; i < ramsize; i += 1) {
    vm.RAMState[i] = RAM_UNALLOC;
  }
  return vm;
}

function make_RAM_table(vm, target) {
  var html = '',
      i = 0,
      hex;
  for(i = vm.RAM.length - 1; i >= 0; i -= 1) {
    hex = (i*4).toString(16);
    html += '<tr id="' + hex + '"><th class="RAM">0x' + hex + '</th><td class="RAM" id="unalloc"></td></tr>';
  }
  target.innerHTML = html;
}

function make_reg_table(vm, target) {
  var html = '',
      i = 0;
  for(i = vm.regs.length - 1; i >= 0; i -= 1) {
    html += '<tr id="r' + i + '"><th class="reg">$' + i + '</th><td class="reg"></td></tr>';
  }
  target.innerHTML = html;
}

function stateToId(x) {
  if(x & RAM_CODE)    { return "code"; }
  if(x & RAM_STACK)   { return "stack"; }
  if(x & RAM_HEAP)    { return "heap"; }
  if(x & RAM_UNALLOC) { return "unalloc"; }
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
  var //hex = x.toString(16),
      disphex = (x*4).toString(16),
      row = document.getElementById(disphex),
      state = vm.RAMState[x],
      here = vm.pc === x,
      val;
  if(row === null) { return; }
  if(state & RAM_CODE) { val = disasm(vm.RAM[x]); }
  else { val = vm.RAM[x]; }
  row.innerHTML = '<th class="RAM"' + (here? 'id="here"':'') + '>0x' + disphex + '</th><td class="RAM" id="' + stateToId(state) + '">' + (((state & RAM_UNINIT) || (state & RAM_UNALLOC)) ? '' : val) + '</td>';
}

function update_reg(vm, x) {
  var row = document.getElementById("r" + x);
  if(row === null) { return; }
  row.innerHTML = '<th class="reg">$' + x + '</th><td class="reg">' + tohex(vm.regs[x]) + '</td>';
}

function program_ram(vm, loc, op) {
  vm.RAM[loc] = op;
  vm.RAMState[loc] = RAM_CODE;
}

function step(vm, n) {
  var dirty = {
                ram: [],
                reg: []
              },
      oldpc = vm.pc,
      data,
      loc,
      write_mem,
      instr, offset,
      i, rsx, rtx, rdx, op, immx;
  function tc32_to_untyped(tc32) { return ((tc32 + 0x8000000) & 0xFFFFFFF) - 0x8000000; }
  function tc16_to_untyped(tc16) { return ((tc16 + 0x8000) & 0xFFFF) - 0x8000; }
  //function rs(x)     { return (x&0x3E00000)>>>21; }
  //function rt(x)     { return (x&0x1F0000)>>>16; }
  //function rd(x)     { return (x&0xF800)>>>11; }
  //function imm(x)    { return tc16_to_untyped(x&0xFFFF); }
  function h(x)      { return (x&0x7C0)>>>6; }
  function target(x) { return (x&0x3FFFFFF); }
  //function opcode(x) { return (x&0xFC000000)>>>26; }
  function funct(x)  { return (x&0x3F); }
  for(i = 0; i < n; i += 1) {
    if(vm.config.faultOnPCEscape && !(vm.RAMState[vm.pc] & RAM_CODE)) {
      throw {
              PC: vm.pc,
              message: "PC at non-code location.",
              fatal: true
      };
    }
    if(vm.config.faultOnUnallocR && (vm.RAMState[vm.pc] & RAM_UNALLOC)) {
      throw {
              PC: vm.pc,
              message: "Attempted to load instruction from unallocated memory.",
              fatal: true
      };
    }
    if(loc >= vm.RAM.length) {
      throw {
              PC: vm.pc,
              message: "Attmpted to load code from non-existant memory at location " + loc.toString(16) + ".",
              fatal: true
      };
    }
    write_mem = false;
    
    instr = vm.RAM[vm.pc];
    rsx = (instr&0x3E00000)>>>21;
    rtx = (instr&0x1F0000)>>>16;
    rdx = (instr&0xF800)>>>11;
    op = (instr&0xFC000000)>>>26;
    immx = tc16_to_untyped(instr&0xFFFF);
    vm.pc += 1;
    switch(op) {
      case opARITH:
        switch(funct(instr)) {
          case opADD:
          case opADDU: vm.regs[rdx] = vm.regs[rsx] + vm.regs[rtx]; break;
          case opAND: vm.regs[rdx] = vm.regs[rsx] & vm.regs[rtx]; break;
          case opDIV:
          case opDIVU:
            vm.lo = Math.floor(vm.regs[rsx] / vm.regs[rtx]) & 0xFFFFFFFF;
            vm.hi = Math.floor(vm.regs[rsx] % vm.regs[rtx]) & 0xFFFFFFFF;
            break;
          case opJR: vm.pc = vm.regs[rsx] - 1; break;
          case opMFHI: vm.regs[rdx] = vm.hi; break;
          case opMFLO: vm.regs[rdx] = vm.lo; break;
          case opMULT:
            /* more disgusting */
            vm.hi = Math.floor((tc32_to_untyped(vm.regs[rsx]) * tc32_to_untyped(vm.regs[rtx]))
                      / 0x100000000) & 0xFFFFFFFF;
            vm.lo = (tc32_to_untyped(vm.regs[rsx]) * tc32_to_untyped(vm.regs[rtx])) & 0xFFFFFFFF;
            break;
          case opMULTU:
            /* disgusting */
            vm.hi = Math.floor((vm.regs[rsx] * vm.regs[rtx]) / 0x100000000) & 0xFFFFFFFF;
            vm.lo = (vm.regs[rsx] * vm.regs[rtx]) & 0xFFFFFFFF;
            break;
          case opOR: vm.regs[rdx] = vm.regs[rsx] | vm.regs[rtx]; break;
          case opSLL: vm.regs[rdx] = vm.regs[rtx] << h(instr); break;
          case opSLLV: vm.regs[rdx] = vm.regs[rtx] << vm.regs[rsx]; break;
          case opSLT:
            vm.regs[rdx] =
              tc32_to_untyped(vm.regs[rsx]) < tc32_to_untyped(vm.regs[rtx]);
            break;
          case opSLTU: vm.regs[rdx] = vm.regs[rsx] < vm.regs[rtx]; break;
          case opSRA: vm.regs[rdx] = vm.regs[rtx] >> h(instr); break;
          case opSRL: vm.regs[rdx] = vm.regs[rtx] >>> h(instr); break;
          case opSRLV: vm.regs[rdx] = vm.regs[rtx] >>> vm.regs[rsx]; break;
          case opSUB:
            vm.regs[rdx] =
              tc32_to_untyped(vm.regs[rsx]) - tc32_to_untyped(vm.regs[rtx]);
            break;
          case opSUBU: vm.regs[rdx] = vm.regs[rsx] - vm.regs[rtx]; break;
          case opSYSCALL:
            /* assume exception handler at 0x80 */
            vm.pc = 0x80/4 - 1;
            break;
          case opXOR: vm.regs[rdx] = vm.regs[rsx] ^ vm.regs[rtx]; break;
          default:
            throw {
              PC: vm.pc,
              op: instr,
              message: "Invalid function code for arithmetic operation.",
              fatal: true
            };
        }
        break;
      case opBRANCH:
        switch(rtx) {
          case opBGEZ: if(tc32_to_untyped(vm.regs[rsx]) >= 0) { vm.pc += immx; } break;
          case opBGEZAL: if(tc32_to_untyped(vm.regs[rsx]) >= 0) { vm.regs[31] = vm.pc; vm.pc += immx; } break;
          case opBLTZ: if(tc32_to_untyped(vm.regs[rsx]) < 0) { vm.pc += immx; } break;
          case opBLTZAL: if(tc32_to_untyped(vm.regs[rsx]) < 0) { vm.regs[31] = vm.pc; vm.pc += immx; } break;
          default: throw {
                     PC: vm.pc,
                     message: "Invalid branch-like opcode.",
                     fatal: true
                   };
        }
        break;
      case opADDI:
        /* eww */
        vm.regs[rtx] =
          tc32_to_untyped(vm.regs[rsx]) + tc32_to_untyped(immx);
        break;
      case opADDIU: vm.regs[rtx] = vm.regs[rsx] + immx; break;
      case opANDI: vm.regs[rtx] = vm.regs[rsx] & immx; break;
      case opBEQ: if(vm.regs[rsx] === vm.regs[rtx]) { vm.pc += immx; } break;
      case opBGTZ: if(tc32_to_untyped(vm.regs[rsx]) > 0) { vm.pc += immx; } break;
      case opBLEZ: if(tc32_to_untyped(vm.regs[rsx]) < 0) { vm.pc += immx; } break;
      case opBNE: if(vm.regs[rsx] !== vm.regs[rtx]) { vm.pc += immx; } break;
      case opJ: vm.pc = (vm.pc & 0xF0000000) | target(instr)/4; break; // TODO
      case opJAL:
        vm.regs[31] = vm.pc + 1;
        vm.pc = (vm.pc & 0xF0000000) | target(instr);
        break;
      case opLB:
      case opLUI: vm.regs[rtx] = immx << 16; break;
      case opLW:
        offset = immx;
        if(offset%4 !== 0) {
          throw {
            PC: vm.pc,
            message: "Unaligned word read.",
            fatal: true
          };
        }
        loc = rsx+immx/4;
        if(loc >= vm.RAM.length) {
          throw {
            PC: vm.pc,
            message: "Attmpted to read from non-existant memory at location " + loc.toString(16) + ".",
            fatal: true
          };
        }
        vm.regs[rtx] = vm.RAM[loc];
        break;
      case opORI:
      case opSB:
      case opSLTI:
      case opSLTIU:
      case opSW:
        offset = immx;
        if(offset%4 !== 0) {
          throw {
            PC: vm.pc,
            message: "Unaligned word store.",
            fatal: true
          };
        }
        loc = vm.regs[rsx] + offset/4;
        data = vm.regs[rtx];
        write_mem = true;
        break;
      case opXORI: break;
      default:
        throw {
          PC: vm.pc,
          message: "Invalid opcode: " + opcode(instr).toString(16) + ".",
          fatal: true
        };
    }
    vm.regs[0] = 0;
    
    dirty.ram = [oldpc, vm.pc];
    if(write_mem) {
      if(loc >= vm.RAM.length) {
        throw {
          PC: vm.pc,
          message: "Attmpted to write to non-existant memory at location " + loc.toString(16) + ".",
          fatal: true
        };
      }
      if(vm.RAMState[loc] & RAM_UNALLOC && vm.config.faultOnUnallocW) {
        throw {
          PC: vm.pc,
          message: "Attempted write to unallocated memory",
          fatal: true
        };
      }
      if(vm.RAMState[loc] & RAM_CODE && vm.config.faultOnCodeW) {
        throw {
          PC: vm.pc,
          message: "Attempted write to protected code location.",
          fatal: true
        };
      }
      if((vm.RAMState[loc] & RAM_UNALLOC) && vm.config.heapAllocOnUnallocW) {
        vm.RAMState[loc] = RAM_HEAP;
      }
      vm.RAM[loc] = data;
      dirty.ram.push(loc);
    }
    dirty.reg = [rsx, rtx, rdx];
  }
  return dirty;
}
