function asmtomips(asm) {
	var s = asm.replace(/:/g,":\n").split("\n").map(
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
	var rxs =
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

	var asm_matches = s.map(function(x) { return rxs.map(function(y) { return y.exec(x); }); }).map(
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

	var labels = new Array();
	var pc = 0;
	for(var idx=0;idx<asm_matches.length;idx++) {
		line = asm_matches[idx];
		if(line[0] == typeL) {
			if(labels[line[1]] != undefined) {
				throw "Label '" + line[1] + "' twice defined.";
			}
			labels[line[1]] = pc;
		} else {
			pc += 4;
		}
	}
	/*for(idx in labels) {
		console.log(idx + ":" + labels[idx]);
	}*/

	function assert_type(i, t) {
		if(i[0] != t) {
			throw "Malformed instruction. Expected type " + t + ", but got " + i[0] + ".";
		}
	}

	function rs(x) {
		return (x<<21)&0x03E00000;
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
			return ((op<<26)&0xFC000000) | (im&0x0000FFFF) | rs(arguments[2]);
		case 4:
			return ((op<<26)&0xFC000000) | (im&0x0000FFFF) | rs(arguments[2]) | rt(arguments[3]);
		}
	}

	function asm_j(op, im) {
		return ((op<<26)&0xFC000000) | (im&0x03FFFFFF);
	}

	function dai(im) {
		if(!isNaN(im)) {
			return im;
		} else {
			if(labels[im] == undefined) {
				throw "Label undefined: " + im + ".";
			}
			return labels[im];
		}
	}

	function dri(im, pc) {
		var a = dai(im);
		return (pc - a)/4;
	}

	var output = new Array();
	for(var idx=0;idx<asm_matches.length;idx++) {
		cpc = 0;
		inst = asm_matches[idx];

		if(inst == null) {
			throw "Garbage in input.";
		}

		if(inst[0] == typeL) {
			continue;
		}

		switch(inst[1]) {

		// R type:
		case "add":
			assert_type(inst, type3R);
			output.push(asm_r(fADD, +inst[2], +inst[3], +inst[4]));
			break;
		case "addu":
			assert_type(inst, type3R);
			output.push(asm_r(fADDU, +inst[2], +inst[3], +inst[4]));
			break;
		case "and":
			assert_type(inst, type3R);
			output.push(asm_r(fAND, +inst[2], +inst[3], +inst[4]));
			break;
		case "break":
			assert_type(inst, type0R);
			output.push(asm_r(opBREAK));
			break;
		case "div":
			assert_type(inst, type2R);
			output.push(asm_r(fDIV, 0, +inst[2], +inst[3]));
			break;
		case "divu":
			assert_type(inst, type2R);
			output.push(asm_r(fDIVU, 0, +inst[2], +inst[3]));
			break;
		case "jalr":
			assert_type(inst, type2R);
			output.push(asm_r(fJALR, 0, +inst[2], +inst[3]));
			break;
		case "jr":
			assert_type(inst, type1R);
			output.push(asm_r(fJR, 0, +inst[2]));
			break;
		case "mfhi":
			assert_type(inst, type1R);
			output.push(asm_r(fMFHI, +inst[2]));
			break;
		case "mfhi":
			assert_type(inst, type1R);
			output.push(asm_r(fMFLO, +inst[2]));
			break;
		case "mthi":
			assert_type(inst, type1R);
			output.push(asm_r(fMTHI, 0, +inst[2]));
			break;
		case "mtlo":
			assert_type(inst, type1R);
			output.push(asm_r(fMTLO, 0, +inst[2]));
			break;
		case "mult":
			assert_type(inst, type2R);
			output.push(asm_r(fMULT, 0, +inst[2], +inst[3]));
			break;
		case "multu":
			assert_type(inst, type2R);
			output.push(asm_r(fMULTU, 0, +inst[2], +inst[3]));
			break;
		case "nor":
			assert_type(inst, type3R);
			output.push(asm_r(fNOR, +inst[2], +inst[3], +inst[4]));
			break;
		case "or":
			assert_type(inst, type3R);
			output.push(asm_r(fOR, +inst[2], +inst[3], +inst[4]));
			break;
		case "sll":
			//TODO: cocks
			break;
		case "sllv":
			assert_type(inst, type3R);
			output.push(asm_r(fSLLV, +inst[2], +inst[4], +inst[3]));
			break;
		case "slt":
			assert_type(inst, type3R);
			output.push(asm_r(fSLT, +inst[2], +inst[3], +inst[4]));
			break;
		case "sltu":
			assert_type(inst, type3R);
			output.push(asm_r(fSLTU, +inst[2], +inst[3], +inst[4]));
			break;
		case "sra":
			//TODO: cocks
			break;
		case "srav":
			assert_type(inst, type3R);
			output.push(asm_r(fSRAV, +inst[2], +inst[4], +inst[3]));
			break;
		case "srl":
			//TODO: cocks
			break;
		case "srlv":
			assert_type(inst, type3R);
			output.push(asm_r(fSRLV, +inst[2], +inst[4], +inst[3]));
			break;
		case "sub":
			assert_type(inst, type3R);
			output.push(asm_r(fSUB, +inst[2], +inst[3], +inst[4]));
			break;
		case "subu":
			assert_type(inst, type3R);
			output.push(asm_r(fSUBU, +inst[2], +inst[3], +inst[4]));
			break;
		case "syscall":
			assert_type(inst, type0R);
			output.push(asm_r(opSYSCALL));
			break;
		case "xor":
			assert_type(inst, type3R);
			output.push(asm_r(fXOR, +inst[2], +inst[3], +inst[4]));
			break;

		// I type:
		case "addi":
			assert_type(inst, typeB);
			output.push(asm_i(opADDI, dai(inst[4]), +inst[3], +inst[2]));
			break;
		case "addiu":
			assert_type(inst, typeB);
			output.push(asm_i(opADDIU, dai(inst[4]), +inst[3], +inst[2]));
			break;
		case "andi":
			assert_type(inst, typeB);
			output.push(asm_i(opANDI, dai(inst[4]), +inst[3], +inst[2]));
			break;
		case "beq":
			assert_type(inst, typeB);
			output.push(asm_i(opBEQ, dri(inst[4], cpc), +inst[2], +inst[3]));
			break;
		case "bgez":
			assert_type(inst, type2I);
			output.push(asm_i(opBGEZ, dri(inst[3], cpc), +inst[2], 1));
			break;
		case "bgtz":
			assert_type(inst, type2I);
			output.push(asm_i(opBGTZ, dri(inst[3], cpc), +inst[2]));
			break;
		case "blez":
			assert_type(inst, type2I);
			output.push(asm_i(opBLEZ, dri(inst[3], cpc), +inst[2]));
			break;
		case "bltz":
			assert_type(inst, type2I);
			output.push(asm_i(opBLTZ, dri(inst[3], cpc), +inst[2]));
			break;
		case "bne":
			assert_type(inst, typeB);
			output.push(asm_i(opBNE, dri(inst[4], cpc), +inst[2], +inst[3]));
			break;
		case "lb":
			assert_type(inst, typeP);
			output.push(asm_i(opLB, dai(inst[3]), +inst[4], +inst[2]));
			break;
		case "lbu":
			assert_type(inst, typeP);
			output.push(asm_i(opLBU, dai(inst[3]), +inst[4], +inst[2]));
			break;
		case "lh":
			assert_type(inst, typeP);
			output.push(asm_i(opLH, dai(inst[3]), +inst[4], +inst[2]));
			break;
		case "lhu":
			assert_type(inst, typeP);
			output.push(asm_i(opLHU, dai(inst[3]), +inst[4], +inst[2]));
			break;
		case "lui":
			assert_type(inst, type2I);
			output.push(asm_i(opLUI, dai(inst[3]), 0, +inst[2]));
			break;
		case "lw":
			assert_type(inst, typeP);
			output.push(asm_i(opLW, dai(inst[3]), +inst[4], +inst[2]));
			break;
		case "lwc1":
			assert_type(inst, typeP);
			output.push(asm_i(opLWC1, dai(inst[3]), +inst[4], +inst[2]));
			break;
		case "ori":
			assert_type(inst, typeB);
			output.push(asm_i(opORI, dai(inst[4]), +inst[3], +inst[2]));
			break;
		case "sb":
			assert_type(inst, typeP);
			output.push(asm_i(opSB, dai(inst[3]), +inst[4], +inst[2]));
			break;
		case "slti":
			assert_type(inst, typeB);
			output.push(asm_i(opSLTI, dai(inst[4]), +inst[3], +inst[2]));
			break;
		case "sltiu":
			assert_type(inst, typeB);
			output.push(asm_i(opSLTIU, dai(inst[4]), +inst[3], +inst[2]));
			break;
		case "sh":
			assert_type(inst, typeP);
			output.push(asm_i(opSH, dai(inst[3]), +inst[4], +inst[2]));
			break;
		case "sw":
			assert_type(inst, typeP);
			output.push(asm_i(opSW, dai(inst[3]), +inst[4], +inst[2]));
			break;
		case "swc1":
			assert_type(inst, typeP);
			output.push(asm_i(opSWC1, dai(inst[3]), +inst[4], +inst[2]));
			break;
		case "xori":
			assert_type(inst, typeB);
			output.push(asm_i(opXORI, dai(inst[4]), +inst[3], +inst[2]));
			break;

		// J type:
		case "j":
			assert_type(inst, type1I);
			output.push(asm_j(opJ, dai(inst[2])));
			break;
		case "jal":
			assert_type(inst, type1I);
			output.push(asm_j(opJAL, dai(inst[2])));
			break;

		default:
			throw "Unknown opcode: " + inst[1] + ".";
			break;
		}

		cpc += 4;
	}

	return output;
}