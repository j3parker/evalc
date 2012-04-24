var term;

function termOpen() {
  term = new Terminal(
         {
           x: 0,
           y: 0,
           frameWidth: 0,
           rows: 30,
           cols: 100,
           termDiv: 'BottomPane',
           ps: '>',
           greeting: '',
           bgColor: '#2d2d2d',
           handler: termHandler,
           crsrBlinkMode: true,
         });
  term.open();
}

function termHandler() {
  this.newLine();
  var line = this.lineBuffer;
  if (line != "") {
    this.write("You typed: "+line);
  }
  this.prompt();
}

function enable_console() { TermGlobals.keylock = false; term.cursorOn(); }
function disable_console() { TermGlobals.keylock = true; term.cursorOff(); }
