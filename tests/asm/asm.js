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
	var rs =
		[
			// 1R
                        /^[ \t]*([a-z]+)[ \t]* \$([0-9]+)$/,
			// 2R
			/^[ \t]*([a-z]+)[ \t]* \$([0-9]+)[ \t]*,[ \t]*\$([0-9]+)$/,
			// 3R
			/^[ \t]*([a-z]+)[ \t]* \$([0-9]+)[ \t]*,[ \t]*\$([0-9]+)[ \t]*,[ \t]*\$([0-9]+)$/,
			// 1I
			/^[ \t]*([a-z]+)[ \t]*([a-zA-Z0-9]+)$/,
			// Branch
			/^[ \t]*([a-z]+)[ \t]*\$([0-9]+)[ \t]*,[ \t]*\$([0-9]+)[ \t]*,[ \t]*([a-zA-Z0-9]+)$/,
			// Load/store
			/^[ \t]*([a-z]+)[ \t]*\$([0-9]+)[ \t]*,[ \t]*([0-9]+)[ \t]*\([ \t]*\$([0-9]+)[ \t]*\)$/,
			// Label
			/^[ \t]*([a-z0-9]+):$/
		];
	var matches = s.map(function(x) { return rs.map(function(y) { return y.exec(x); }); }).map(
		function(v) {
			for(var i=0; i<v.length; i++) {
				if(v[i] != null) {
					return v[i].slice(1, v.length-1);
				}
			}
			return null;
		});
	return matches;
}
