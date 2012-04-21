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
    hex = i.toString(16);
    html += '<tr id="' + hex + '"><th class="RAM">0x' + hex + '</th><td class="RAM" id="unalloc"></td></tr>';
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

function update_ram(vm, x) {
  var hex = x.toString(16);
  var row = document.getElementById(hex);
  var state = vm.RAMState[x];
  var here = vm.pc == x;
  row.innerHTML = '<th class="RAM"' + (here? 'id="here"':'') + '>0x' + hex + '</th><td class="RAM" id="' + stateToId(state) + '">' + (((state & RAM_UNINIT) || (state & RAM_UNALLOC)) ? '' : vm.RAM[x]) + '</td>';
}

function program_ram(vm, loc, op) {
  vm.RAM[loc] = op;
  vm.RAMState[loc] = RAM_CODE;
}

function step(vm) {
  var oldpc = vm.pc;
  function rs(x)     { return (x&0x3E00000)>>>21; }
  function rt(x)     { return (x&0x1F0000)>>>16; }
  function rd(x)     { return (x&0xF800)>>>11; }
  function imm(x)    { return (x&0xFFFF); }
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
  var data, loc;
  var write_mem = false;
  instr = vm.RAM[vm.pc];
  switch(opcode(instr)) {
    case opARITH:
      switch(funct(instr)) {
        case fADD:
        case fADDU: vm.regs[rd(instr)] = vm.regs[rs(instr)] + vm.regs[rt(instr)]; break;
        case fAND: vm.regs[rd(instr)] = vm.regs[rs(instr)] & vm.regs[rt(instr)]; break;
        case fDIV:
        case fDIVU:
          vm.lo = vm.regs[rs(instr)] / vm.regs[rt(instr)];
          vm.hi = vm.regs[rs(instr)] % vm.regs[rt(instr)];
          break;
        case fJR: vm.pc = vm.regs[rs(instr)] - 1; break; // TODO: ???
        case fMFHI: vm.regs[rd(instr)] = vm.hi; break;
        case fMFLO: vm.regs[rd(instr)] = vm.lo; break;
        case fMULT:
        case fMULTU: vm.lo = vm.regs[rs(instr)] * vm.regs[rt(instr)]; break;
        case fNOOP: console.log("hey!"); break;
        case fOR: vm.regs[rd(instr)] = vm.regs[rs(instr)] | vm.regs[rt(instr)]; break;
        case fSLL: vm.regs[rd(instr)] = vm.regs[rt(instr)] << h(instr); break;
        case fSLLV: vm.regs[rd(instr)] = vm.regs[rt(instr)] << vm.regs[rs(instr)]; break;
        case fSLT:
        case fSLTU: vm.regs[rd(instr)] = vm.regs[rs(instr)] < vm.regs[rt(instr)]; break;
        case fSRA: vm.regs[rd(instr)] = vm.regs[rt(instr)] >> h(instr); break;
        case fSRL: vm.regs[rd(instr)] = vm.regs[rt(instr)] >>> h(instr); break;
        case fSRLV: vm.regs[rd(instr)] = vm.regs[rt(instr)] >>> vm.regs[rs(instr)]; break;
        case fSUB:
        case fSUBU: vm.regs[rd(instr)] = vm.regs[rs(instr)] - vm.regs[rt(instr)]; break;
        case fSYSCALL: break; /* TODO */
        case fXOR: vm.regs[rd(instr)] = vm.regs[rs(instr)] ^ vm.regs[rt(instr)]; break;
        default:
          throw {
            PC: vm.pc,
            op: instr,
            message: "Invalid function code for arithmetic operation.",
            fatal: true,
          }
      }
      break;
    case opADDI:
    case opADDIU: vm.regs[rt(instr)] = vm.regs[rs(instr)] + imm(instr); break;
    case opANDI:
    case opBEQ: if(vm.regs[rs(instr)] == vm.regs[rt(instr)]) vm.pc = imm(instr) - 1; break;
    case opBGEZ:
    case opBGTZ:
    case opBLEZ:
    case opBNE:
    case opJ: vm.pc = (vm.pc & 0xF0000000) | (target(instr)/4); break; // TODO
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
      vm.regs[rt(instr)] = vm.RAM[rs(instr)+imm(instr)/4];
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
    if(vm.RAMState[loc] & RAM_UNALLOC && vm.config.heapAllocOnUnallocW)
      vm.RAMState[loc] ^= RAM_UNALLOC;

    vm.RAM[loc] = data;
    update_ram(vm, loc);
  }
}
