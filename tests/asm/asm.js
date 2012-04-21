function asmtomips(asm) {
	var s = asm.replace(":",":\n").split("\n").map(
			function(x) {
				return x.replace(/ *; .*$/, "");
			  }
		).filter(
			function(x) {
				return (null == /^[ \t]*$/.exec(x));
			}
		);

	var type0R = 0
	    type1R = 1,
	    type2R = 2,
	    type3R = 3,
	    type1I = 4,
	    type2I = 5,
	    typeB = 6,
	    typeP = 7,
	    typeL = 8;
	var rs =
		[
			// 0R
			/^[ \t]*([a-z]+)$/,
			// 1R
                        /^[ \t]*([a-z]+)[ \t]* \$([0-9]+)$/,
			// 2R
			/^[ \t]*([a-z]+)[ \t]* \$([0-9]+)[ \t]*,[ \t]*\$([0-9]+)$/,
			// 3R
			/^[ \t]*([a-z]+)[ \t]* \$([0-9]+)[ \t]*,[ \t]*\$([0-9]+)[ \t]*,[ \t]*\$([0-9]+)$/,
			// 1I
			/^[ \t]*([a-z]+)[ \t]* ([a-zA-Z0-9]+)$/,
			// 2I
			/^[ \t]*([a-z]+)[ \t]* \$([0-9]+)[ \t]*[ \t]*,[ \t]*([a-zA-Z0-9]+)$/,
			// Branch
			/^[ \t]*([a-z]+)[ \t]* \$([0-9]+)[ \t]*,[ \t]*\$([0-9]+)[ \t]*,[ \t]*([a-zA-Z0-9]+)$/,
			// Load/store
			/^[ \t]*([a-z]+)[ \t]* \$([0-9]+)[ \t]*,[ \t]*([0-9]+)[ \t]*\([ \t]*\$([0-9]+)[ \t]*\)$/,
			// Label
			/^[ \t]*([a-z0-9]+):$/
		];

	var matches = s.map(function(x) { return rs.map(function(y) { return y.exec(x); }); }).map(
		function(v) {
			for(var i=0; i<v.length; i++) {
				if(v[i] != null) {
					var foo = [];
					foo.push(i);
					foo.push.apply(foo, v[i].slice(1, v.length-1));
					return foo;
				}
			}
			return null;
		});

	function assert_type(i, t) {
		if(i[0] != t) {
			throw "Malformed instruction. Expected type " + t + ", but got " + i[0] + ".";
		}
	}

	function rs(x) {
		return (x<<21)&0x3E000000;
	}
	function rt(x) {
		return (x<<16)&0x001F0000;
	}
	function rd(x) {
		return (x<<11)&0x0000F800;
	}

	function asm_r(fun) {
		switch(arguments.length) {
		case 1:
			return ((fun)&0x3F);
		case 2:
			return ((fun)&0x3F) | rd(arguments[1]);
		case 3:
			return ((fun)&0x3F) | rd(arguments[1]) | rs(arguments[2]);
		case 4:
			return ((fun)&0x3F) | rd(arguments[1]) | rs(arguments[2]) | rt(arguments[3]);
		}
	}

	function asm_i(op, im) {
		switch(arguments.length) {
		case 3:
			return ((op<<26)&0xFC000000) | rs(arguments[2]);
		case 4:
			return ((op<<26)&0xFC000000) | rs(arguments[2]) | rt(arguments[3]);
		}
	}

	function asm_j(op, im) {
		return ((op<<26)&0xFC000000) | (im&0x03FFFFFF);
	}

	var output = [];
	console.log(matches);
	for(idx in matches) {
		inst = matches[idx];
		console.log(inst[1]);
		if(inst == null) {
			throw "Garbage in input.";
		}
		switch(inst[1]) {

		// R type:
		case "add":
			assert_type(inst, type3R);
			output = output.append(asm_r(opADD, +inst[2], +inst[3], +inst[4]));
			break;
		case "addu":
			assert_type(inst, type3R);
			output = output.append(asm_r(opADDU, +inst[2], +inst[3], +inst[4]));
			break;
		case "and":
			assert_type(inst, type3R);
			output = output.append(asm_r(opAND, +inst[2], +inst[3], +inst[4]));
			break;
		case "break":
			assert_type(inst, type0R);
			output = output.append(asm_r(opBREAK));
			break;
		case "div":
			assert_type(inst, type2R);
			output = output.append(asm_r(opDIV, 0, +inst[2], +inst[3]));
			break;
		case "divu":
			assert_type(inst, type2R);
			output = output.append(asm_r(opDIVU, 0, +inst[2], +inst[3]));
			break;
		case "jalr":
			assert_type(inst, type2R);
			output = output.append(asm_r(opJALR, 0, +inst[2], +inst[3]));
			break;
		case "jr":
			assert_type(inst, type1R);
			output = output.append(asm_r(opJR, 0, +inst[2]));
			break;
		case "mfhi":
			assert_type(inst, type1R);
			output = output.append(asm_r(opMFHI, +inst[2]));
			break;
		case "mfhi":
			assert_type(inst, type1R);
			output = output.append(asm_r(opMFLO, +inst[2]));
			break;
		case "mthi":
			assert_type(inst, type1R);
			output = output.append(asm_r(opMTHI, 0, +inst[2]));
			break;
		case "mtlo":
			assert_type(inst, type1R);
			output = output.append(asm_r(opMTLO, 0, +inst[2]));
			break;
		case "mult":
			assert_type(inst, type2R);
			output = output.append(asm_r(opMULT, 0, +inst[2], +inst[3]));
			break;
		case "multu":
			assert_type(inst, type2R);
			output = output.append(asm_r(opMULTU, 0, +inst[2], +inst[3]));
			break;
		case "nor":
			assert_type(inst, type3R);
			output = output.append(asm_r(opNOR, +inst[2], +inst[3], +inst[4]));
			break;
		case "or":
			assert_type(inst, type3R);
			output = output.append(asm_r(opOR, +inst[2], +inst[3], +inst[4]));
			break;
		case "sll":
			//TODO: cocks
			break;
		case "sllv":
			assert_type(inst, type3R);
			output = output.append(asm_r(opSLLV, +inst[2], +inst[4], +inst[3]));
			break;
		case "slt":
			assert_type(inst, type3R);
			output = output.append(asm_r(opSLT, +inst[2], +inst[3], +inst[4]));
			break;
		case "sltu":
			assert_type(inst, type3R);
			output = output.append(asm_r(opSLTU, +inst[2], +inst[3], +inst[4]));
			break;
		case "sra":
			//TODO: cocks
			break;
		case "srav":
			assert_type(inst, type3R);
			output = output.append(asm_r(opSRAV, +inst[2], +inst[4], +inst[3]));
			break;
		case "srl":
			//TODO: cocks
			break;
		case "srlv":
			assert_type(inst, type3R);
			output = output.append(asm_r(opSRLV, +inst[2], +inst[4], +inst[3]));
			break;
		case "sub":
			assert_type(inst, type3R);
			output = output.append(asm_r(opSUB, +inst[2], +inst[3], +inst[4]));
			break;
		case "subu":
			assert_type(inst, type3R);
			output = output.append(asm_r(opSUBU, +inst[2], +inst[3], +inst[4]));
			break;
		case "syscall":
			assert_type(inst, type0R);
			output = output.append(asm_r(opSYSCALL));
			break;
		case "xor":
			assert_type(inst, type3R);
			output = output.append(asm_r(opXOR, +inst[2], +inst[3], +inst[4]));
			break;

		// I type:
		case "addi":
			assert_type(inst, typeB);
			output = output.append(asm_i(opADDI, +inst[4], +inst[3], +inst[2]));
			break;
		case "addiu":
			assert_type(inst, typeB);
			output = output.append(asm_i(opADDIU, +inst[4], +inst[3], +inst[2]));
			break;
		case "andi":
			assert_type(inst, typeB);
			output = output.append(asm_i(opANDI, +inst[4], +inst[3], +inst[2]));
			break;
		case "beq":
			assert_type(inst, typeB);
			output = output.append(asm_i(opBEQ, +inst[4], +inst[2], +inst[3]));
			break;
		case "bgez":
			assert_type(inst, type2I);
			output = output.append(asm_i(opBGEZ, +inst[3], +inst[2], 1));
			break;
		case "bgtz":
			assert_type(inst, type2I);
			output = output.append(asm_i(opBGTZ, +inst[3], +inst[2]));
			break;
		case "blez":
			assert_type(inst, type2I);
			output = output.append(asm_i(opBLEZ, +inst[3], +inst[2]));
			break;
		case "bltz":
			assert_type(inst, type2I);
			output = output.append(asm_i(opBLTZ, +inst[3], +inst[2]));
			break;
		case "bne":
			assert_type(inst, typeB);
			output = output.append(asm_i(opBNE, +inst[4], +inst[2], +inst[3]));
			break;
		case "lb":
			assert_type(inst, typeP);
			output = output.append(asm_i(opLB, +inst[3], +inst[4], +inst[2]));
			break;
		case "lbu":
			assert_type(inst, typeP);
			output = output.append(asm_i(opLBU, +inst[3], +inst[4], +inst[2]));
			break;
		case "lh":
			assert_type(inst, typeP);
			output = output.append(asm_i(opLH, +inst[3], +inst[4], +inst[2]));
			break;
		case "lhu":
			assert_type(inst, typeP);
			output = output.append(asm_i(opLHU, +inst[3], +inst[4], +inst[2]));
			break;
		case "lui":
			assert_type(inst, type2I);
			output = output.append(asm_i(opLUI, +inst[3], 0, +inst[2]));
			break;
		case "lw":
			assert_type(inst, typeP);
			output = output.append(asm_i(opLW, +inst[3], +inst[4], +inst[2]));
			break;
		case "lwc1":
			assert_type(inst, typeP);
			output = output.append(asm_i(opLWC1, +inst[3], +inst[4], +inst[2]));
			break;
		case "ori":
			assert_type(inst, typeB);
			output = output.append(asm_i(opORI, +inst[4], +inst[3], +inst[2]));
			break;
		case "sb":
			assert_type(inst, typeP);
			output = output.append(asm_i(opSB, +inst[3], +inst[4], +inst[2]));
			break;
		case "slti":
			assert_type(inst, typeB);
			output = output.append(asm_i(opSLTI, +inst[4], +inst[3], +inst[2]));
			break;
		case "sltiu":
			assert_type(inst, typeB);
			output = output.append(asm_i(opSLTIU, +inst[4], +inst[3], +inst[2]));
			break;
		case "sh":
			assert_type(inst, typeP);
			output = output.append(asm_i(opSH, +inst[3], +inst[4], +inst[2]));
			break;
		case "sw":
			assert_type(inst, typeP);
			output = output.append(asm_i(opSW, +inst[3], +inst[4], +inst[2]));
			break;
		case "swc1":
			assert_type(inst, typeP);
			output = output.append(asm_i(opSWC1, +inst[3], +inst[4], +inst[2]));
			break;
		case "xori":
			assert_type(inst, typeB);
			output = output.append(asm_i(opXORI, +inst[4], +inst[3], +inst[2]));
			break;

		// J type:
		case "j":
			assert_type(inst, type1I);
			output = output.append(asm_j(opJ, +inst[2]));
			break;
		case "jal":
			assert_type(inst, type1I);
			output = output.append(asm_j(opJAL, +inst[2]));
			break;

		default:
			throw "faggot";
			break;
		}
	}

	return output;	
}
