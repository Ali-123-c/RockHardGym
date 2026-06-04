/**
 * ZKTeco Authentication Test Script
 * Tries multiple auth methods to find what works.
 * 
 * Run: node scripts/test-auth.js
 */
const net = require('net');

const DEVICE_IP = '192.168.100.14';
const DEVICE_PORT = 4370;
const COMM_KEY = 1; // Change this based on what's on the device

// Command constants
const CMD_CONNECT = 1000;
const CMD_AUTH = 1102;
const CMD_DISABLEDEVICE = 1003;
const CMD_FREE_DATA = 1502;
const CMD_DATA_WRRQ = 1503;
const CMD_EXIT = 1001;
const USHRT_MAX = 65535;

function createChkSum(buf) {
  let chksum = 0;
  for (let i = 0; i < buf.length; i += 2) {
    if (i == buf.length - 1) {
      chksum += buf[i];
    } else {
      chksum += buf.readUInt16LE(i);
    }
    chksum %= USHRT_MAX;
  }
  chksum = USHRT_MAX - chksum - 1;
  return chksum;
}

function createTCPHeader(command, sessionId, replyId, data) {
  const dataBuffer = Buffer.from(data);
  const buf = Buffer.alloc(8 + dataBuffer.length);
  buf.writeUInt16LE(command, 0);
  buf.writeUInt16LE(0, 2);
  buf.writeUInt16LE(sessionId, 4);
  buf.writeUInt16LE(replyId, 6);
  dataBuffer.copy(buf, 8);
  const chksum2 = createChkSum(buf);
  buf.writeUInt16LE(chksum2, 2);
  replyId = (replyId + 1) % USHRT_MAX;
  buf.writeUInt16LE(replyId, 6);
  const prefixBuf = Buffer.from([0x50, 0x50, 0x82, 0x7d, 0x13, 0x00, 0x00, 0x00]);
  prefixBuf.writeUInt16LE(buf.length, 4);
  return Buffer.concat([prefixBuf, buf]);
}

function removeTcpHeader(buf) {
  if (buf.length < 8) return buf;
  if (buf.compare(Buffer.from([0x50, 0x50, 0x82, 0x7d]), 0, 4, 0, 4) !== 0) return buf;
  return buf.slice(8);
}

function decodeCommandId(reply) {
  const r = removeTcpHeader(reply);
  if (r && r.length >= 2) return r.readUInt16LE(0);
  return null;
}

function sendCommand(socket, command, data, sessionId, replyId) {
  return new Promise((resolve, reject) => {
    const buf = createTCPHeader(command, sessionId, replyId, data);
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), 5000);
    socket.once('data', (data) => {
      clearTimeout(timer);
      resolve(data);
    });
    socket.write(buf, (err) => {
      if (err) { clearTimeout(timer); reject(err); }
    });
  });
}

async function tryAuth(password, label) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let sessionId = 0;
    let replyId = 0;

    socket.setTimeout(5000);

    socket.on('connect', async () => {
      try {
        // Step 1: CMD_CONNECT
        const connectReply = await sendCommand(socket, CMD_CONNECT, '', sessionId, replyId);
        const r = removeTcpHeader(connectReply);
        if (!r) { resolve({ label, success: false, error: 'No CONNECT reply' }); socket.destroy(); return; }
        sessionId = r.readUInt16LE(4);
        replyId++;

        // Step 2: CMD_AUTH with password
        const authBuf = Buffer.alloc(4);
        authBuf.writeUInt32LE(password, 0);
        const authReply = await sendCommand(socket, CMD_AUTH, authBuf, sessionId, replyId);
        replyId++;
        const cmdId = decodeCommandId(authReply);
        const authOk = cmdId === 2000;
        
        if (authOk) {
          resolve({ label, success: true, sessionId, message: `AUTH OK with password=${password}` });
        } else {
          resolve({ label, success: false, error: `AUTH returned CMD_${cmdId} (${cmdId === 2005 ? 'UNAUTH' : cmdId})`, sessionId });
        }
      } catch (err) {
        resolve({ label, success: false, error: err.message });
      }
      socket.destroy();
    });

    socket.on('error', (err) => {
      resolve({ label, success: false, error: err.message });
    });

    socket.on('timeout', () => {
      resolve({ label, success: false, error: 'Connection timeout' });
      socket.destroy();
    });

    socket.connect(DEVICE_PORT, DEVICE_IP);
  });
}

async function main() {
  console.log(`\n=== ZKTeco Auth Test (${DEVICE_IP}:${DEVICE_PORT}) ===`);
  console.log(`Configured Communication Key: ${COMM_KEY}\n`);

  const tests = [
    { password: 0, label: 'password=0 (default)' },
    { password: 1, label: 'password=1 (as reported)' },
    { password: 1234, label: 'password=1234 (common default)' },
    { password: 4321, label: 'password=4321' },
    { password: 12345, label: 'password=12345' },
    { password: 0, label: 'password=0 (4-byte buffer)' },
    { password: COMM_KEY, label: `password=${COMM_KEY} (configured key)` },
  ];

  for (const test of tests) {
    const result = await tryAuth(test.password, test.label);
    if (result.success) {
      console.log(`✅ ${result.label} — AUTH OK! Session: ${result.sessionId}`);
    } else {
      console.log(`❌ ${result.label} — ${result.error}`);
    }
  }

  console.log('\n=== Test Complete ===\n');
  console.log('If none succeeded, please check the device Communication Key:');
  console.log('  Menu → Comm → Communication Key');
  console.log('  The value shown there must match one of the passwords above.\n');
  console.log('Also try the device with Communication Key set to 0 (disabled):');
  console.log('  Menu → Comm → Communication Key → Set to 0\n');
}

main().catch(console.error);
