var term;
var con = {
  bufferlen: 0,
  putc: function(x) {
    switch(x) {
      case '\r':
      case '\n':
        this.flush();
        term.newLine();
        break;
      default:
        this.buffer += x;
        if(this.buffer.length > this.bufferlen) this.flush();
    }
  },

  getc: function() {
    enable_console();
  },

  flush: function() {
    term.write(this.buffer);
    this.buffer = '';
  },

  buffer: '',
}

function termOpen() {
  term = new Terminal(
         {
           rows: 30,
           cols: 100,
           termDiv: 'console',
           ps: '>',
           greeting: '',
           bgColor: '#232E45',
           handler: termHandler,
           initHandler: termInit,
           crsrBlinkMode: true,
         });
  term.open();
}

function termHandler() {
  this.lock = true;
  this.cursorOff();
  var key = this.inputChar;
  switch(key) {
    case 13:
      this.newLine();
      break;
    default:
      if(this.isPrintable(key)) {
        this.type(String.fromCharCode(key));
      } else {
        console.log('console: bad key: ' + key);
      }
  }
  this.cursorOn();
  this.lock = false;
}

function termInit() {
  this.charMode = true;
  this.cursorOn();
  this.lock = false;
}
