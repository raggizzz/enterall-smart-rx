const http = require('http');

async function test() {
  try {
    const pResponse = await fetch('http://localhost:3000/api/patients');
    const patients = await pResponse.json();
    const patientId = patients[0].id;

    const fResponse = await fetch('http://localhost:3000/api/formulas');
    const formulas = await fResponse.json();
    const formulaId = formulas[0].id;

    const payload = {
        patientId,
        therapyType: 'enteral',
        systemType: 'closed',
        feedingRoute: 'SNE',
        infusionMode: 'pump',
        formulas: [{ formulaId, volume: 1000, timesPerDay: 1 }],
        startDate: new Date().toISOString()
    };

    const res = await fetch('http://localhost:3000/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    console.log(res.status);
    const text = await res.text();
    console.log(text);
  } catch(e) { console.error(e); }
}
test();
