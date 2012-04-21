function disasm(instr) {
  function rs(x)     { return (x&0x3E00000)>>>21; }
  function rt(x)     { return (x&0x1F0000)>>>16; }
  function rd(x)     { return (x&0xF800)>>>11; }
  function imm(x)    { return (x&0xFFFF); }
  function h(x)      { return (x&0x7C0)>>>6; }
  function target(x) { return (x&0x3FFFFFF); }
  function opcode(x) { return (x&0xFC000000)>>>26; }
  function funct(x)  { return (x&0x3F); }
  switch(opcode(instr)) {
    case opARITH:
      switch(funct(instr)) {
        case opADD:     return "add $" + rd(instr) + ", $" + rs(instr) + ", $" + rt(instr);
        case opADDU:    return "addu $" + rd(instr) + ", $" + rs(instr) + ", $" + rt(instr);
        case opAND:     return "and $" + rd(instr) + ", $" + rs(instr) + ", $" + rt(instr);
        case opDIV:     return "div $" + rs(intsr) + ", $" + rt(instr);
        case opDIVU:    return "divu $" + rs(intsr) + ", $" + rt(instr);
        case opJR:      return "jr $" + rs(instr);
        case opMFHI:    return "mfhi $" + rd(instr);
        case opMFLO:    return "mflo $" + rd(instr);
        case opMULT:    return "mult $" + rs(intsr) + ", $" + rt(instr);
        case opMULTI:   return "multu $" + rs(intsr) + ", $" + rt(instr);
        case opNOOP:    return "noop ";
        case opSLL:     return "sll $" + rd(instr) + ", $" + rt(instr) + ", " + h(instr);
        case opSLLV:    return "sslv $" + rd(instr) + ", $" + rt(instr) + ", $" + rs(instr);
        case opSLT:     return "slt $" + rd(instr) + ", $" + rs(instr) + ", $" + rt(instr);
        case opSLTU:    return "sltu $" + rd(instr) + ", $" + rs(instr) + ", $" + rt(instr);
        case opSRA:     return "sra $" + rd(instr) + ", $" + rt(instr) + ", " + h(instr);
        case opSRL:     return "srl $" + rd(instr) + ", $" + rt(instr) + ", " + h(instr);
        case opSRLV:    return "srlv $" + rd(instr) + ", $" + rs(instr) + ", $" + rt(instr);
        case opSUB:     return "sub $" + rd(instr) + ", $" + rs(instr) + ", $" + rt(instr);
        case opSUBU:    return "subu $" + rd(instr) + ", $" + rs(instr) + ", $" + rt(instr);
        case opSYSCALL: return "syscall";
        case opXOR:     return "xor $" + rd(instr) + ", $" + rs(instr) + ", $" + rt(instr);
        default:        return "???";
      }
      break;
    case opBRANCH:
      switch(rt(instr)) {
        case opBGEZ:   return "bgez $" + rs(instr) + ", 0x" + imm(instr).toString(16);
        case opBGEZAL: return "bgezal ";
        case opBLTZ:   return "bltz ";
        case opBLTZAL: return "bltzal ";
        default:       return "???";
      }
      break;
    case opADDI:   return "addi $" + rd(instr) + ", $" + rs(instr) + ", 0x" + imm(instr).toString(16);
    case opANDI:   return "andi $" + rd(instr) + ", $" + rs(instr) + ", 0x" + imm(instr).toString(16);
    case opBEQ:    return "beq $" + rs(instr) + ", $" + rt(instr) + ", 0x" + imm(instr).toString(16);
    case opBGTZ:   return "bgtz $";
    case opBLEZ:   return "blez $";
    case opBNE:    return "bne $";
    case opJ:      return "j 0x" + target(instr).toString(16);
    case opJAL:    return "jal $";
    case opLB:     return "lb $";
    case opLUI:    return "lui $";
    case opLW:     return "lw $";
    case opORI:    return "ori $" + rd(instr) + ", $" + rs(instr) + ", 0x" + imm(instr).toString(16);
    case opSB:     return "sb $";
    case opSLTI:   return "slti $" + rd(instr) + ", $" + rs(instr) + ", 0x" + imm(instr).toString(16);
    case opSLTIU:  return "sltiu $" + rd(instr) + ", $" + rs(instr) + ", 0x" + imm(instr).toString(16);
    case opSW:     return "sw $" + rt(instr) + ", 0x" + imm(instr).toString(16) + "($" + rs(instr) + ")";
    case opXORI:   return "xori $" + rd(instr) + ", $" + rs(instr) + ", 0x" + imm(instr).toString(16);
    default:       return "???";
  }
}
