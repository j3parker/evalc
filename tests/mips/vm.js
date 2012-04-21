var RAM_CODE    = 0x01,
    RAM_STACK   = 0x02,
    RAM_HEAP    = 0x04,
    RAM_UNALLOC = 0x08
    RAM_UNINIT  = 0x10,
    RAM_UNALLO  = 0x20;

function make_vm(ramsize) {
  if(typeof ramsize == "undefined" || !isFinite(ramsize)) return null;
  return {
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
      heapAllocOnUnallocW: true,
    },
  }
}

function make_RAM_table(vm, target) {
  var html = '';
  for(var i = vm.RAM.length - 1; i >= 0; i--) {
    hex = i.toString(16);
    html += '<tr id="' + hex + '"><th class="RAM">0x' + hex + '</th><td class="RAM" id="unalloc"></td></tr>';
  }
  target.innerHTML = html;
}

function step(vm) {
  function rs(x)     { return x&0x3E00000>>>21; }
  function rt(x)     { return x&0x1F0000>>>16; }
  function rd(x)     { return x&0xF800>>>11; }
  function imm(x)    { return x&0xFFFF; }
  function h(x)      { return x&0x7C0>>6; }
  function target(x) { return x&0x3FFFFFF; }
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
        case fNOOP: break;
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
    case opADDIU:
    case opANDI:
    case opBEQ: if(vm.regs[rs(instr)] == vm.regs[rt(instr)]) vm.pc = imm(instr) - 1; break;
    case opBGEZ:
    case opBGTZ:
    case opBLEZ:
    case opBNE:
    case opJ: vm.pc = (vm.pc & 0xF0000000) | target(instr); break; // TODO
    case opJAL:
    case opLB:
    case opLUI:
    case opLW:
    case opORI:
    case opSB:
    case opSLTI:
    case opSLTIU:
    case opSW:
    case opXORI:
    default:
      throw {
        PC: vm.pc,
        op: instr,
        message: "Invalid opcode.",
        fatal: true,
      }
  }
  vm.pc += 1;
}
