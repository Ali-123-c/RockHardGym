#!/usr/bin/env node
/**
 * ZKTeco Device Connection Diagnostic Script
 * 
 * Run: node scripts/diagnose-device-connection.js
 * 
 * Tests connectivity to the ZKTeco fingerprint device
 * and provides actionable guidance.
 */

const net = require('net');
const { execSync } = require('child_process');
const os = require('os');

const ZK_PORT = 4370;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const [, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return null;
}

function getSubnet(ip) {
  const parts = ip.split('.');
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

async function checkPort(ip, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    
    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(timeout);
    socket.on('connect', () => finish(true));
    socket.on('timeout', () => finish(false));
    socket.on('error', () => finish(false));
    socket.connect(port, ip);
  });
}

async function scanSubnet(subnet) {
  console.log(`\n🔍 Scanning ${subnet}.0/24 on port ${ZK_PORT}...`);
  
  const results = [];
  const ips = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);
  
  for (let i = 0; i < ips.length; i += 20) {
    const batch = ips.slice(i, i + 20);
    const checks = await Promise.all(batch.map((ip) => checkPort(ip, ZK_PORT)));
    checks.forEach((open, idx) => {
      if (open) {
        console.log(`  ✅ ${batch[idx]} — ZKTeco port ${ZK_PORT} OPEN`);
        results.push(batch[idx]);
      }
    });
  }
  
  return results;
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  ZKTeco Device Connection Diagnostics');
  console.log('═══════════════════════════════════════════\n');

  const localIP = getLocalIP();
  if (!localIP) {
    console.error('❌ Could not determine local IP address.');
    process.exit(1);
  }
  
  console.log(`📡 Your IP: ${localIP}`);
  const subnet = getSubnet(localIP);
  console.log(`🌐 Subnet: ${subnet}.0/24\n`);

  // Check if the configured device IP is reachable
  const configuredIP = process.env.DEVICE_IP || '192.168.100.16';
  console.log(`📋 Checking configured device IP: ${configuredIP}:${ZK_PORT}...`);
  
  const configuredOpen = await checkPort(configuredIP, ZK_PORT);
  if (configuredOpen) {
    console.log(`  ✅ ${configuredIP}:${ZK_PORT} — REACHABLE`);
    console.log('\n✅ Your device is reachable at the configured IP.');
    console.log('   If attendance still fails, the issue is in the ZKTeco protocol handshake.');
    console.log('   Check:');
    console.log('   - Device communication key matches fingerprint-bridge/.env');
    console.log('   - Device is not already connected to another client');
    console.log('   - Restart the device (power cycle) and restart the bridge');
  } else {
    console.log(`  ❌ ${configuredIP}:${ZK_PORT} — UNREACHABLE\n`);
    
    // Scan the subnet
    console.log('🔎 Scanning for ZKTeco devices on your network...');
    const found = await scanSubnet(subnet);
    
    if (found.length > 0) {
      console.log(`\n✅ Found ${found.length} device(s) with port ${ZK_PORT} open:`);
      found.forEach((ip) => console.log(`   - ${ip}:${ZK_PORT}`));
      console.log(`\n💡 Your device appears to be at a DIFFERENT IP than configured.`);
      console.log(`   Update fingerprint-bridge/.env:`);
      console.log(`   DEVICE_IP=${found[0]}`);
      console.log(`   Then restart the bridge.`);
    } else {
      console.log(`\n❌ No ZKTeco devices found on ${subnet}.0/24.`);
      console.log('\nPossible causes:');
      console.log('   1. Device is powered OFF — check power cable');
      console.log('   2. Device is on a DIFFERENT subnet');
      console.log('   3. Firewall is blocking port 4370');
      console.log('   4. Ethernet cable is disconnected');
      console.log('\nSteps:');
      console.log('   1. Check device display for its IP address');
      console.log('   2. Press Menu → Comm → Ethernet on the device');
      console.log('   3. Verify IP, port, and communication key');
      console.log('   4. Ensure device is on the same network as this PC');
    }
  }
  
  console.log('\n═══════════════════════════════════════════\n');
}

main().catch((error) => {
  console.error('Diagnostic failed:', error);
  process.exit(1);
});
