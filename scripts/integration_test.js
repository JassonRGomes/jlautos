const BASE_URL = "http://localhost:5001/api";

async function runIntegrationTests() {
  console.log("====================================================");
  console.log("   J&L AUTOS AUTOMATED INTEGRATION FLOWS VERIFICATION");
  console.log("====================================================");

  let authToken = "";

  // Helper fetch with authentication
  async function apiFetch(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(authToken && { "Authorization": `Bearer ${authToken}` }),
      ...options.headers,
    };
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    return res;
  }

  // 1. AUTHENTICATE CUSTOMER
  console.log("\n[Step 1] Authenticating customer (VIP Buyer)...");
  const loginRes = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "vip.buyer@gmail.com",
      password: "CustomerPass2026!"
    })
  });

  if (!loginRes.ok) {
    console.error(`❌ Failed to log in customer: ${loginRes.status} - ${await loginRes.text()}`);
    process.exit(1);
  }

  const customerData = await loginRes.json();
  console.log(`✅ Customer authenticated: ${customerData.user.name} (${customerData.user.email})`);

  // Extract token from set-cookie header
  const setCookie = loginRes.headers.get("set-cookie");
  if (setCookie) {
    const match = setCookie.match(/token=([^;]+)/);
    if (match) {
      authToken = match[1];
    }
  }

  if (!authToken) {
    console.error("❌ Token not found in login set-cookie headers! Headers received:", loginRes.headers);
    process.exit(1);
  }

  // Get active vehicle
  const vehiclesRes = await apiFetch("/vehicles");
  if (!vehiclesRes.ok) {
    console.error(`❌ Failed to fetch vehicle inventory: ${vehiclesRes.status}`);
    process.exit(1);
  }
  const { vehicles } = await vehiclesRes.json();
  console.log(`✅ Fetched showroom inventory. Found ${vehicles.length} vehicles.`);

  let porsche = null;
  let aston = null;
  for (const v of vehicles) {
    if (v.make === "Porsche" && v.model === "911 GT3 RS") porsche = v;
    if (v.make === "Aston Martin" && v.model === "DBS Superleggera") aston = v;
  }

  if (!porsche || !aston) {
    console.error("❌ Seed data missing Porsche or Aston Martin!");
    process.exit(1);
  }

  console.log(`👉 Found Porsche: ${porsche.year} ${porsche.make} ${porsche.model} (Finance/Warranty Active: ${porsche.isFinanceWarrantyActive})`);
  console.log(`👉 Found Aston Martin: ${aston.year} ${aston.make} ${aston.model} (Finance/Warranty Active: ${aston.isFinanceWarrantyActive})`);

  // 2. CREATE BOOKING
  console.log("\n[Step 2] Scheduling a private viewing booking (Porsche)...");
  const randomDays = Math.floor(Math.random() * 120) + 10;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + randomDays);
  const futureDateString = futureDate.toISOString().split("T")[0];
  console.log(`👉 Selected date for viewing: ${futureDateString}`);

  const bookingRes = await apiFetch("/bookings", {
    method: "POST",
    body: JSON.stringify({
      vehicleId: porsche.id,
      date: futureDateString,
      timeSlot: "10:30 AM",
      eventType: "VISIT"
    })
  });

  if (!bookingRes.ok) {
    console.error(`❌ Failed to schedule booking: ${bookingRes.status} - ${await bookingRes.text()}`);
    process.exit(1);
  }
  const bookingData = await bookingRes.json();
  console.log("✅ Booking scheduled successfully!");
  console.log(bookingData.message);

  // 3. CREATE OFFER / PROPOSAL
  console.log("\n[Step 3] Submitting price proposal offer for Porsche...");
  const offerRes = await apiFetch("/offers/submit", {
    method: "POST",
    body: JSON.stringify({
      vehicleId: porsche.id,
      offerAmount: 280000.00
    })
  });

  if (!offerRes.ok) {
    console.error(`❌ Failed to submit offer: ${offerRes.status} - ${await offerRes.text()}`);
    process.exit(1);
  }
  const offerData = await offerRes.json();
  console.log("✅ Offer proposal submitted successfully!");
  console.log(`   Offer ID: ${offerData.offer.id} - Amount: $${offerData.offer.offerAmount} (Status: ${offerData.offer.status})`);

  // 4. LOG OUT CUSTOMER & LOG IN ADMIN
  console.log("\n[Step 4] Authenticating administrator (administrator)...");
  authToken = ""; // Reset auth
  const adminLoginRes = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "admin@jlautos.com",
      password: "admin"
    })
  });

  if (!adminLoginRes.ok) {
    console.error(`❌ Failed to log in administrator: ${adminLoginRes.status} - ${await adminLoginRes.text()}`);
    process.exit(1);
  }

  const adminData = await adminLoginRes.json();
  console.log(`✅ Administrator authenticated: ${adminData.user.name} (${adminData.user.email})`);

  const adminSetCookie = adminLoginRes.headers.get("set-cookie");
  if (adminSetCookie) {
    const match = adminSetCookie.match(/token=([^;]+)/);
    if (match) {
      authToken = match[1];
    }
  }

  if (!authToken) {
    console.error("❌ Administrator token not found in login set-cookie headers!");
    process.exit(1);
  }

  // 5. CRM BOOKINGS LEDGER
  console.log("\n[Step 5] Fetching CRM leads ledger...");
  const customersRes = await apiFetch("/settings/customers");
  if (!customersRes.ok) {
    console.error(`❌ Failed to retrieve customer directory: ${customersRes.status}`);
    process.exit(1);
  }
  const customersData = await customersRes.json();
  console.log(`✅ CRM Directory loaded. Registered clients count: ${customersData.count}`);

  // Approve offer proposal
  const pendingRes = await apiFetch("/offers/manager");
  if (!pendingRes.ok) {
    console.error(`❌ Failed to retrieve pending offers: ${pendingRes.status}`);
    process.exit(1);
  }
  const { offers } = await pendingRes.json();
  console.log(`✅ Pending offers loaded: ${offers.length}`);

  let porscheOffer = null;
  for (const o of offers) {
    if (o.vehicleId === porsche.id) {
      porscheOffer = o;
      break;
    }
  }

  if (porscheOffer) {
    console.log(`👉 Reviewing Porsche acquisition proposal: $${porscheOffer.offerAmount} from ${porscheOffer.user.name}`);
    const updateRes = await apiFetch(`/offers/${porscheOffer.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "ACCEPTED" })
    });
    if (!updateRes.ok) {
      console.error(`❌ Failed to update offer status: ${updateRes.status} - ${await updateRes.text()}`);
      process.exit(1);
    }
    console.log("✅ Acquisition offer status updated to ACCEPTED!");
  }

  // 6. GENERATE PDF / EXCEL REPORTS
  console.log("\n[Step 6] Verifying PDF & Excel Report generation engines...");

  // PDF Inventory
  const pdfRes = await apiFetch("/settings/export?format=pdf&type=inventory");
  if (!pdfRes.ok) {
    console.error(`❌ Failed to generate PDF inventory report: ${pdfRes.status}`);
    process.exit(1);
  }
  const pdfBuffer = await pdfRes.arrayBuffer();
  console.log(`✅ PDF Inventory Report generated successfully (${pdfBuffer.byteLength} bytes)`);

  // Excel Inventory
  const excelRes = await apiFetch("/settings/export?format=excel&type=inventory");
  if (!excelRes.ok) {
    console.error(`❌ Failed to generate Excel inventory report: ${excelRes.status}`);
    process.exit(1);
  }
  const excelBuffer = await excelRes.arrayBuffer();
  console.log(`✅ Excel Inventory Report generated successfully (${excelBuffer.byteLength} bytes)`);

  // PDF Leads
  const leadsPdfRes = await apiFetch("/settings/export?format=pdf&type=leads");
  if (!leadsPdfRes.ok) {
    console.error(`❌ Failed to generate PDF CRM leads report: ${leadsPdfRes.status}`);
    process.exit(1);
  }
  const leadsPdfBuffer = await leadsPdfRes.arrayBuffer();
  console.log(`✅ PDF CRM Leads Report generated successfully (${leadsPdfBuffer.byteLength} bytes)`);

  // PDF Sales
  const salesPdfRes = await apiFetch("/settings/export?format=pdf&type=sales");
  if (!salesPdfRes.ok) {
    console.error(`❌ Failed to generate PDF sales report: ${salesPdfRes.status}`);
    process.exit(1);
  }
  const salesPdfBuffer = await salesPdfRes.arrayBuffer();
  console.log(`✅ PDF Sales Report generated successfully (${salesPdfBuffer.byteLength} bytes)`);

  console.log("\n====================================================");
  console.log("🎉 ALL INTEGRATION FLOWS VERIFIED SUCCESSFULLY WITH ZERO ERRORS!");
  console.log("====================================================");
}

runIntegrationTests();
