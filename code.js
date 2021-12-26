// This is fanoush and Jeffmer's sample code that I'm futzing around with
// MIT License (c) 2020 fanoush https://github.com/fanoush
// see full license text at https://choosealicense.com/licenses/mit/

var glbSt = {
    brightnessLevel: 64,
    clockLastMinShown: -1,
    currVolt: 0,
    currScr: 0,
    currSubScr: 0
};

// Watchdog (dog emoji)
E.kickWatchdog();
function intervalWatchdogKicker() {
    if ((typeof (BTN1) == 'undefined') || (!BTN1.read())) E.kickWatchdog();
}
setInterval(intervalWatchdogKicker, 2000);
E.enableWatchdog(15, false);

// Pinout here
LCD_RESET = D2;
LCD_CS = D3;
VIBRATION_PIN = D6;
I2C_POWER = D7;
CHARGER = D8;
BACKLIGHT = D12;
I2C_SCL = D14;
I2C_SDA = D15;
ACCEL_IRQ = D16;
FLASH_CS = D17;
NRF_RESET = D18;
FLASH_SCK = D19;
IO0_MOSI = D20;
IO1_MISO = D21;
IO2_WP = D22;
IO3_RS_HOLD = D23;
BUTTON = D26;
BATT_VOLTAGE = D30;
TOUCH_IRQ = D32;
TOUCH_RESET = D39;
LCD_MOSI = D44;
LCD_SCK = D45;
LCD_DC = D47;

// setup I2C for touch, accelerometer and maybe heartrate sensor
var i2c = new I2C();
function configureI2CPins() {
    I2C_POWER.write(1);
    pinMode(TOUCH_IRQ, 'input');
    i2c.setup({
        scl: I2C_SCL,
        sda: I2C_SDA,
        bitrate: 200000
    });
}
configureI2CPins();

// functions for interfacing with the native C SPI function
var spiUtils = {
    delayMs: function (ms) {
        digitalPulse(LCD_DC, 0, ms);
        digitalPulse(LCD_DC, 0, 0); // 0 = wait for previous
    },
    toFlatString: function (arr) {
        var b = E.toString(arr); if (b) return b;
        print("toFlatString() fail&retry!"); E.defrag(); b = E.toString(arr); if (b) return b;
        print("fail&retry again!"); E.defrag(); b = E.toString(arr); if (b) return b;
        print("failed!"); return b;
    },
    sendCmd: function (arr) {
        var l = arr.length;
        if (!l) return SPI2.spiCmdFour(arr, -1, -1, -1);
        if (l == 1) return SPI2.spiCmdFour(arr[0], -1, -1, -1);
        if (l == 2) return SPI2.spiCmdFour(arr[0], arr[1], -1, -1);
        if (l == 3) return SPI2.spiCmdFour(arr[0], arr[1], arr[2], -1);
        if (l == 4) return SPI2.spiCmdFour(arr[0], arr[1], arr[2], arr[3]);
        var b = spiUtils.toFlatString(arr);
        SPI2.spiCmd(E.getAddressOf(b, true), b.length);
    },
    sendCmdArr: function (arr) {
        var b = spiUtils.toFlatString(arr);
        var c = SPI2.spiCmdArr(E.getAddressOf(b, true), b.length);
        if (c < 0) print('lcd_cmds: buffer mismatch, cnt=' + c);
        return c;
    }
};

// native C SPI function by fanoush
var SPI2 = (function () {
    var bin = atob("//////////8AAAAAAAAAAP////8AAAAAAAAAAAAAAL8QtQVMfETE6QABASEB+gLyxOkCIxC9AL/Y////BksAIsP4ACXD+AghASJaYNP4BCMKscP4CCNwRwDwAkAUS9P4ACUQtQq70/gEIwqxw/gIIxBKekQABhRow/gIRVRow/gMRRRpw/gQRU/w/zTD+BRF0mjD+GwlSQAAIsP4cCXD+CQFw/hUFQEgEL1P8P8w++cA8AJAiv///xC1A0x8RKKC4IIhg2ODEL1A////FEt7RDC1nIsRS0yx0/gYQQAs+9AQTX1EACTD+BhBrIMAJMP4OEXD+BhBw/hEBcP4SBUBIRlhGrEIS3tEmYMwvdP4GCEAKvvQACLD+Bgh9ucA8AJALv///xr////2/v//F0t7RBC12mgqsxRMByLE+AAlASLE+HAlm2gbsU/woELC+Aw1ACL/97v/Dkt7RJtoG7FP8KBCwvgINQtLe0SbaBuxT/CgQsL4CDUAIAEjxPgABWNgEL1P8P8w++cA8AJAzv7//6T+//+U/v//cLUERoixRhgAJSBGEPgBGxmxRBi0QgLZbUIoRnC9//e5/wAo+dEBNe/nBUb15wAALen/QRpNbkZ9RAdGDEYF8QgItEYoaGlotkau6AMACDVFRXZG9tEoaM74AAACNKiIqXmu+AQABPD+BI74BhAH8P4HjfgJII34CzASEhsSATwPIWBGjfgDcI34BUCN+AggjfgKMP/3tP8EsL3o8IEAvzgCAAATtQAoHdsAKaa/jfgFEAIkASQAKqG/AqkJGQE0AfgELAAror8CqhIZATSN+AQAqL8C+AQ8IUYBqP/3Wv8gRgKwEL0AJPrnAAAt6fBPubDN6QESWUp6RAdGkvgUoAAoAPCogAApAPClgArx/zMHKwDyoIABIwP6CvMBOwVG27I1+AJLA5MCm9/4NIGy+BiQHEEAI8j4cDUHI8j4ADWTaKSyG7FP8KBCwvgMNU/qSgPbsgSTQ0t7RCCoBZMIq83pBjBP8AALWUYFmwKe24oAkwObAZojQET6CvQy+BPAA5sjQET6CvQy+BMgBJseRPayBy6Bvwg+FfgBO/ayxvEIDoS/A/oO8xxDT+ocE0NUEwpD6gwcQxgB8QIOg/gBwACbAPgOIAMxAjubsl8ppLIAkwndASL/963+2/EBCwu/B5gGmFlGACEAmwArwdEeS3tECfH/OVqLF0Q9RgKaNfgCSx/6ifkUQaSyufEAD6zRmbFKRv/3jv4US3tEm2gbsU/woELC+Ag1ACABI8j4AAXI+AQwObC96PCPm4sAK+vQ2PgYMQAr+9AJSnpEACPI+Bgxk4Pg50/w/zDr52z9//8A8AJADP3//3T8//9K/P//Gvz//wUqAAAAAAUrAAAAAAEsAAA=");
    return {
        spiCmd: E.nativeCall(301, "int(int,int)", bin),
        spiCmdArr: E.nativeCall(409, "int(int,int)", bin),
        spiCmdFour: E.nativeCall(573, "int(int,int,int,int)", bin),
        setPins: E.nativeCall(33, "void(int,int,int,int)", bin),
        setWin: E.nativeCall(457, "void(int,int,int,int)", bin),
        enableSpi: E.nativeCall(93, "int(int,int)", bin),
        spiDisable: E.nativeCall(61, "void()", bin),
        blitSetup: E.nativeCall(185, "void(int,int,int,int)", bin),
        blitPal: E.nativeCall(645, "int(int,int,int)", bin),
    };
})();

// configure pins for SPI communication
function configureLcdPins() {
    LCD_RESET.set();
    LCD_SCK.write(0);
    LCD_MOSI.write(0);
    LCD_CS.write(1);
    LCD_DC.write(1);
    SPI2.setPins(LCD_SCK, LCD_MOSI, LCD_CS, LCD_DC);
    SPI2.enableSpi(0x14, 0); // 32MBit, mode 0
}
configureLcdPins();

// create graphics buffer (this need to be global)
var bitsPerPixel = 4; // powers of two work, 3=8 colors would be nice
var gfxBuf = Graphics.createArrayBuffer(240, 280, bitsPerPixel);
var paletteData; // need this outside because it'll be referenced

// functions added to gfxBuf
// page flip - "Flipping" a page means swapping between a complete buffer and an in-progress buffer.
gfxBuf.pageFlip = function (force) {
    var r = gfxBuf.getModified(true);
    if (force)
        r = { x1: 0, y1: 0, x2: this.getWidth() - 1, y2: this.getHeight() - 1 };
    if (r === undefined) return;
    var x1 = r.x1 & 0xfe; var x2 = (r.x2 + 2) & 0xfe; // for 12bit mode align to 2 pixels
    var xw = (x2 - x1);
    var yw = (r.y2 - r.y1 + 1);
    if (xw < 1 || yw < 1) { print("empty rect ", xw, yw); return; }
    SPI2.blitSetup(xw, yw, bitsPerPixel, gfxBuf.stride);
    var xbits = x1 * bitsPerPixel;
    var bitoff = xbits % 8;
    var addr = gfxBuf.framebufferAddress + (xbits - bitoff) / 8 + r.y1 * gfxBuf.stride; // address of upper left corner
    SPI2.setWin(r.x1, r.x2, r.y1, r.y2);
    SPI2.blitPal(addr, gfxBuf.paletteAddress, bitoff);
};

// set up brightness
gfxBuf.setBrightness = function (newLevel) {
    if (newLevel >= 0 && newLevel <= 256) {
        // if I'm given a valid new level, store it and use it
        glbSt.brightnessLevel = newLevel;
        this.currBrightLevel = newLevel;
    }
    else {
        // otherwise don't change it and just read the stored one
        this.currBrightLevel = glbSt.brightnessLevel;
    }
    if (this.isOn) {
        decimalBrightness = this.currBrightLevel / 256;
        if (decimalBrightness == 0 || decimalBrightness == 1) {
            digitalWrite(BACKLIGHT, decimalBrightness);
        } else {
            analogWrite(BACKLIGHT, decimalBrightness, { freq: 60 });
        }
    }
};

// functions to turn it on and off 
gfxBuf.screenOn = function () {
    if (this.isOn) {
        return; // if it's already on
    }
    touchControl.startTouch();
    spiUtils.sendCmd(0x11);
    gfxBuf.pageFlip();
    this.isOn = true;
    this.setBrightness();
};

gfxBuf.screenOff = function () {
    if (!this.isOn) {
        return;
    }
    touchControl.stopTouch();
    spiUtils.sendCmd(0x10);
    BACKLIGHT.reset();
    this.isOn = false;
};

// start LCD
function startLcd() {
    // palette for 4 bpp
    paletteData = Uint16Array([0x000, 0x00a, 0x0a0, 0x0aa, 0xa00, 0xa0a, 0xa50, 0xaaa,
        0x555, 0x55f, 0x5f5, 0x5ff, 0xf55, 0xf5f, 0xff5, 0xfff]);

    // get addresses for page flipping and put them in the object
    gfxBuf.paletteAddress = E.getAddressOf(paletteData.buffer, true);
    gfxBuf.framebufferAddress = E.getAddressOf(gfxBuf.buffer, true);
    gfxBuf.stride = gfxBuf.getWidth() * bitsPerPixel / 8;

    // send commands to get it started
    spiUtils.sendCmd(0x11); // sleep out
    spiUtils.delayMs(120);
    spiUtils.sendCmd([0x36, 0]); // MADCTL - This is an unrotated screen
    spiUtils.sendCmd([0x37, 1, 44]); //256+44=300 = offset by -20 so no need to add +20 to y
    // These 2 rotate the screen by 180 degrees
    //spiUtils.sendCmd([0x36,0xC0]); // MADCTL
    //spiUtils.sendCmd([0x37,0,80]); // VSCSAD (37h): Vertical Scroll Start Address of RAM
    spiUtils.sendCmd([0x3A, 0x03]);  // COLMOD - interface pixel format - 03 - 12bitsPerPixel, 05 - 16bitsPerPixel
    spiUtils.sendCmd([0xB2, 0xb, 0xb, 0x33, 0x00, 0x33]); // PORCTRL (B2h): Porch Setting
    spiUtils.sendCmd([0xB7, 0x11]); // GCTRL (B7h): Gate Control
    spiUtils.sendCmd([0xBB, 0x35]); // VCOMS (BBh): VCOM Setting 
    spiUtils.sendCmd([0xC0, 0x2c]);
    spiUtils.sendCmd([0xC2, 1]); // VDVVRHEN (C2h): VDV and VRH Command Enable
    spiUtils.sendCmd([0xC3, 8]); // VRHS (C3h): VRH Set 
    spiUtils.sendCmd([0xC4, 0x20]); // VDVS (C4h): VDV Set
    spiUtils.sendCmd([0xC6, 0x1F]); // VCMOFSET (C5h): VCOM Offset Set .
    spiUtils.sendCmd([0xD0, 0xA4, 0xA1]); // PWCTRL1 (D0h): Power Control 1 
    spiUtils.sendCmd([0xe0, 0xF0, 0x4, 0xa, 0xa, 0x8, 0x25, 0x33, 0x27, 0x3d, 0x38, 0x14, 0x14, 0x25, 0x2a]); // PVGAMCTRL (E0h): Positive Voltage Gamma Control
    spiUtils.sendCmd([0xe1, 0xf0, 0x05, 0x08, 0x7, 0x6, 0x2, 0x26, 0x32, 0x3d, 0x3a, 0x16, 0x16, 0x26, 0x2c]); // NVGAMCTRL (E1h): Negative Voltage Gamma Contro
    spiUtils.sendCmd(0x21); // INVON (21h): Display Inversion On
    spiUtils.sendCmd([0x35, 0]);
    spiUtils.sendCmd([0x44, 0x25, 0, 0]);
    spiUtils.delayMs(120);
    spiUtils.sendCmd([0x2a, 0, 0, 0, 239]);
    spiUtils.sendCmd([0x2b, 0, 0x14, 1, 0x2b]);
    spiUtils.sendCmd(0x29);
    spiUtils.sendCmd([0x35, 0]);

    // the screen starts off
    gfxBuf.isOn = false;
}
startLcd();

// touchscreen control class from Jeffmer's driver
var touchControl = {
    // swipe directions
    swipeUp: 1, swipeDown: 2, swipeLeft: 3, swipeRight: 4, tap: 5,
    // stuff to keep track of gestures
    watchId: undefined, xCoord: -1, yCoord: -1, midTouch: false,
    // functions here
    startTouch: function () {
        digitalPulse(TOUCH_RESET, 0, 5);
        var t = getTime() + 50 / 1000; while (getTime() < t); // delay 50 ms
        touchControl.sendGestureCommand();
        if (touchControl.watchId) {
            clearWatch(touchControl.watchId);
        }
        touchControl.watchId = setWatch(touchControl.touchEvent, TOUCH_IRQ, { repeat: true, edge: "falling" });
    },
    getCoords: function () {
        var interruptData = touchControl.readBytes(0x00, 8);
        //console.log(interruptData)
        // this returns an array of 8 ints
        // [0]: always 0, [1]: gesture (not available), [2]: touch detected (1) or not (0)
        // [3]: state -> (0 start touch, 128 continue touch, 64 lifting finger)
        // [4]: x coord, [5]: 1 if you're swiping from the bottom, 0 otherwise
        // [6]: y coord, [7]: always 16 lol
        return {
            x: ((interruptData[3] & 0x0F) << 8) | interruptData[4],
            y: ((interruptData[5] & 0x0F) << 8) | interruptData[6],
            touch: interruptData[2],
            swipeDirection: 0
        };
    },
    sendGestureCommand: function () {
        touchControl.writeByte(0xED, 0xC8); // I'm not sure what this does, probably not needed
    },
    sleepMode: function () {
        touchControl.writeByte(0xA5, 0x03);
    },
    touchEvent: function () {
        var coords = touchControl.getCoords();
        if (coords.touch && !touchControl.midTouch) {
            touchControl.xCoord = coords.x;
            touchControl.yCoord = coords.y;
            touchControl.midTouch = true;
        }
        if (!coords.touch && touchControl.midTouch) {
            var xTravel = Math.abs(coords.x - touchControl.xCoord);
            var yTravel = Math.abs(coords.y - touchControl.yCoord);
            touchControl.midTouch = false;
            if (xTravel < 30 && yTravel < 30) {
                // touch up and down didn't travel more than 30 pixels
                touchControl.emit("touch", coords);
                return;
            }
            if (yTravel > xTravel) {
                // if y changed more than x that means swipe up or down
                coords.swipeDirection = coords.y > touchControl.yCoord ? touchControl.swipeDown : touchControl.swipeUp;
            } else {
                coords.swipeDirection = coords.x > touchControl.xCoord ? touchControl.swipeRight : touchControl.swipeLeft;
            }
            touchControl.emit("swipe", coords.swipeDirection);
        }
    },
    stopTouch: function () {
        if (touchControl.watchId) {
            touchControl.watchId = clearWatch(touchControl.watchId);
            touchControl.watchId = undefined;
        }
        touchControl.sleepMode();
    },
    writeByte: function (a, d) {
        i2c.writeTo(0x15, a, d);
    },
    readBytes: function (a, n) {
        i2c.writeTo(0x15, a);
        return i2c.readFrom(0x15, n);
    }
};

// Vibration pattern
function vibOnHelper(vibrationObj) {
    // start vibrating
    if (vibrationObj.intensity >= 1) {
        VIBRATION_PIN.write(0);
    } else {
        // for decimals
        analogWrite(VIBRATION_PIN, vibrationObj.intensity);
    }
    // wait the specified miliseconds then run vibOffHelper, passing the obj
    setTimeout(vibOffHelper, vibrationObj.onms, vibrationObj);
}
function vibOffHelper(vibrationObj) {
    // stop vibrating
    VIBRATION_PIN.write(1);
    if (vibrationObj.count > 1) {
        // decrement from the number of vibrations specified
        vibrationObj.count--;
        // wait the specified miliseconds then run vibOnHelper, passing the obj
        setTimeout(vibOnHelper, vibrationObj.offms, vibrationObj);
    }
}
function vibratePattern(intensity, count, onms, offms) {
    // this passes the vibration object between vibration on and off until the count stops
    vibOnHelper({
        intensity, count, onms, offms
    });
}

// Battery level
function readBatteryVoltage() {
    return 4.20 / 0.59 * analogRead(BATT_VOLTAGE);
}
function determineBatteryPercentage(currVolt) {
    var lowVolt = 3.5, highVolt = 4.19;
    currVolt = currVolt ? currVolt : readBatteryVoltage();
    if (currVolt >= highVolt) {
        return 100;
    }
    if (currVolt <= lowVolt) {
        return 0;
    }
    return 100 * (currVolt - lowVolt) / (highVolt - lowVolt);
}
function batteryStringGenerator(currVolt) {
    currVolt = currVolt ? currVolt : battVolts();
    return `${determineBatteryPercentage(currVolt) | 0}% ${currVolt.toFixed(2)}V`;
}

// stuff happens here
require("Font8x16").add(Graphics);

var appScr = {
    drawClock: function () {
        // get date
        var dateObj = Date();
        glbSt.currVolt = glbSt.currVolt ? (glbSt.currVolt + readBatteryVoltage()) / 2 : readBatteryVoltage(); // average until shown
        if (dateObj.getMinutes() == glbSt.clockLastMinShown) {
            return;
        }
        var dateArr = dateObj.toString().split(' ');
        var timeArr = dateArr[4].split(':');
        glbSt.clockLastMinShown = timeArr[1];

        // clear and see what we're working with
        gfxBuf.clear(); // native thing
        var gfxWidth = gfxBuf.getWidth();

        // draw the battery string
        gfxBuf.setColor(15);
        gfxBuf.setFont("8x16");
        var batteryString = batteryStringGenerator(glbSt.currVolt);
        glbSt.currVolt = 0; // clear average
        gfxBuf.drawString(batteryString, gfxWidth - gfxBuf.stringWidth(batteryString) - 20, 4);

        // draw the clock
        var hourMinuteString = timeArr[0] + ":" + timeArr[1];
        gfxBuf.setFontVector(86);
        gfxBuf.drawString(hourMinuteString, 4 + (gfxWidth - gfxBuf.stringWidth(hourMinuteString)) / 2, 80);
        if (bitsPerPixel == 1) {
            gfxBuf.pageFlip();
        }

        // draw the date
        var dateString = dateArr[0] + " " + dateArr[1] + " " + dateArr[2];
        gfxBuf.setFontVector(28);
        gfxBuf.setColor(8 + 3);
        gfxBuf.drawString(dateString, (gfxWidth - gfxBuf.stringWidth(dateString)) / 2, 180);
        gfxBuf.pageFlip();
    },
    clockScr: function () {
        glbSt.clockLastMinShown = -1;
        appScr.drawClock();
        return setInterval(function () {
            appScr.drawClock();
        }, 1000);
    },
    testOneScr: function () {
        gfxBuf.clear(); // native thing
        gfxBuf.setFont("8x16");
        gfxBuf.drawString("test1", 20, 20);
        gfxBuf.pageFlip();
    },
    infoCubeScr: function () {
        gfxBuf.clear();
        gfxBuf.setFont("6x8", 2);
        gfxBuf.setColor(10);
        gfxBuf.drawString("Espruino " + process.version, 30, 20);
        gfxBuf.setFont("6x8", 1);
        gfxBuf.setColor(14);
        gfxBuf.drawString("ST7789 12 bit mode, 32Mbps SPI with DMA", 6, 42);
        for (var c1 = 0; c1 < 8; c1++) {
            gfxBuf.setColor(c1 + 8);
            gfxBuf.fillRect(20 + 25 * c1, 185, 45 + 25 * c1, 205);
        }
        for (var c2 = 0; c2 < 8; c2++) {
            gfxBuf.setColor(c2);
            gfxBuf.fillRect(20 + 25 * c2, 210, 45 + 25 * c2, 230);
        }
        gfxBuf.pageFlip();
        return setInterval(function () {
            appScr.stepCube();
        }, 5);
    },
    stepCube: function () {
        appVars.cubeRx += 0.1;
        appVars.cubeRy += 0.1;
        gfxBuf.setColor(0);
        gfxBuf.fillRect(60, 60, 180, 180);
        gfxBuf.setColor(1 + appVars.cubeCc);
        appVars.cubeCc = (appVars.cubeCc + 1) % 15;
        appScr.drawCube(120, 120, 120);
        // update the whole display
        gfxBuf.pageFlip();
    },
    drawCube: function (xx, yy, zz) {
        // precalculate sin&cos for rotations
        var rcx = Math.cos(appVars.cubeRx), rsx = Math.sin(appVars.cubeRx);
        var rcy = Math.cos(appVars.cubeRy), rsy = Math.sin(appVars.cubeRy);
        // Project 3D into 2D
        function p(x, y, z) {
            var t;
            t = x * rcy + z * rsy;
            z = z * rcy - x * rsy;
            x = t;
            t = y * rcx + z * rsx;
            z = z * rcx - y * rsx;
            y = t;
            z += 4;
            return [xx + zz * x / z, yy + yy * y / z];
        }
        var a, b;
        // -z
        a = p(-1, -1, -1); b = p(1, -1, -1);
        gfxBuf.drawLine(a[0], a[1], b[0], b[1]);
        a = p(1, 1, -1);
        gfxBuf.drawLine(a[0], a[1], b[0], b[1]);
        b = p(-1, 1, -1);
        gfxBuf.drawLine(a[0], a[1], b[0], b[1]);
        a = p(-1, -1, -1);
        gfxBuf.drawLine(a[0], a[1], b[0], b[1]);
        // z
        a = p(-1, -1, 1); b = p(1, -1, 1);
        gfxBuf.drawLine(a[0], a[1], b[0], b[1]);
        a = p(1, 1, 1);
        gfxBuf.drawLine(a[0], a[1], b[0], b[1]);
        b = p(-1, 1, 1);
        gfxBuf.drawLine(a[0], a[1], b[0], b[1]);
        a = p(-1, -1, 1);
        gfxBuf.drawLine(a[0], a[1], b[0], b[1]);
        // edges
        a = p(-1, -1, -1); b = p(-1, -1, 1);
        gfxBuf.drawLine(a[0], a[1], b[0], b[1]);
        a = p(1, -1, -1); b = p(1, -1, 1);
        gfxBuf.drawLine(a[0], a[1], b[0], b[1]);
        a = p(1, 1, -1); b = p(1, 1, 1);
        gfxBuf.drawLine(a[0], a[1], b[0], b[1]);
        a = p(-1, 1, -1); b = p(-1, 1, 1);
        gfxBuf.drawLine(a[0], a[1], b[0], b[1]);
    },
    randomLinesScr: function () {
        gfxBuf.clear();
        var cols = (bitsPerPixel == 1) ? 14 : (1 << bitsPerPixel) - 1, w = gfxBuf.getWidth(), h = gfxBuf.getHeight(), r = Math.random;
        return setInterval(function () {
            gfxBuf.setColor(1 + r() * cols);
            gfxBuf.drawLine(r() * w, r() * h, r() * w, r() * h);
            gfxBuf.pageFlip();
        }, 5);
    },
    randomShapesScr: function () {
        gfxBuf.clear();
        var cols = (bitsPerPixel == 1) ? 14 : (1 << bitsPerPixel) - 1, w = gfxBuf.getWidth() - 10, h = gfxBuf.getHeight() - 10, r = Math.random;
        return setInterval(function () {
            gfxBuf.setBgColor(0);
            gfxBuf.setColor(1 + r() * cols);
            x1 = r() * w; x2 = 10 + r() * w;
            y1 = r() * h; y2 = 10 + r() * h;
            if (x1 & 1) {
                gfxBuf.fillEllipse(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2));
            } else {
                gfxBuf.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2));
            }
            gfxBuf.flip();
        }, 5);
    }
};

var appVars = {
    cubeRx: 0,
    cubeRy: 0,
    cubeCc: 1
};

function sleepWatch() {
    gfxBuf.clear();
    gfxBuf.screenOff();
    return 0;
}

touchControl.on("touch", (p) => {
    console.log("touch x: " + p.x + " y:" + p.y);
});
touchControl.on("swipe", (d) => {
    console.log("swipe d: " + d);
});
touchControl.on("longtouch", (p) => {
    console.log("long touch");
});

var screens=[appScr.clock,appScr.infoCubeScr,sleepWatch];
var currscr= -1;
var currint=0;
setWatch(function(){
  if (!gfxBuf.isOn) gfxBuf.screenOn();
  currscr++;if (currscr>=screens.length) currscr=0;
  if (currint>0) clearInterval(currint);
  currint=screens[currscr]();
},BTN1,{ repeat:true, edge:'rising',debounce:25 }
);