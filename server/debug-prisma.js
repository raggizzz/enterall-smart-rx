const { execSync } = require('child_process');
try {
    execSync('npx prisma validate', { stdio: 'pipe' });
    console.log("Success");
} catch (e) {
    require('fs').writeFileSync('out.txt', e.stderr.toString() + '\\n' + e.stdout.toString() + '\\n' + e.message);
}
