// Exit 0 bila versi Node >= 18.17
const [a, b] = process.versions.node.split('.').map(Number);
process.exit(a > 18 || (a === 18 && b >= 17) ? 0 : 1);
