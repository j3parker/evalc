function handle_code() {
  var parse_tree, code;
  mipsviewer.setValue('');
  try {
    parse_tree = c.parse(editor.getValue());
  } catch(err) {
    return;
  }

  try {
    analyze(parse_tree, null);
  } catch(err) {
    return;
  }

  try {
    code = gen(parse_tree);
  } catch(err) {
    return;
  }
  mipsviewer.setValue(code.join(''));
}
