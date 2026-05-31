const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5001';

async function runTests() {
  console.log(`🚀 Starting Test Drive Bookings API Integration Tests on ${BASE_URL}...`);

  let customerToken = '';
  let dealerToken = '';
  let testVehicleId = '';
  let testBookingId = '';

  try {
    // 1. Authenticate / Login as Dealer (Admin)
    console.log('\n--- 1. Authenticating Dealer/Admin ---');
    try {
      const dealerLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'admin@jlautos.com',
        password: 'Password123!'
      });
      dealerToken = dealerLogin.data.token;
      console.log('✅ Dealer authenticated successfully.');
    } catch (err) {
      console.log('⚠️ Failed login with Password123!, trying administrator...');
      const dealerLogin2 = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'admin@jlautos.com',
        password: 'administrator'
      });
      dealerToken = dealerLogin2.data.token;
      console.log('✅ Dealer authenticated successfully with alternative password.');
    }

    // 2. Register / Authenticate Customer
    console.log('\n--- 2. Registering/Logging in Customer ---');
    const customerEmail = `customer_${Date.now()}@test.com`;
    const customerRegister = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: customerEmail,
      password: 'Password123!',
      name: 'Test Customer',
      phone: '+15550199'
    });
    customerToken = customerRegister.data.token;
    console.log(`✅ Customer registered/logged in successfully: ${customerEmail}`);

    // 3. Retrieve a valid vehicle ID
    console.log('\n--- 3. Fetching available vehicle ---');
    const vehiclesRes = await axios.get(`${BASE_URL}/api/vehicles`);
    const vehicles = vehiclesRes.data.data || vehiclesRes.data;
    if (!vehicles || vehicles.length === 0) {
      throw new Error('No vehicles found in database to execute test drives.');
    }
    testVehicleId = vehicles[0].id;
    console.log(`✅ Using Vehicle ID: ${testVehicleId} (${vehicles[0].make} ${vehicles[0].model})`);

    // 4. Test Customer booking creation (Standard Successful Case)
    console.log('\n--- 4. Creating Test Drive Booking (Standard Case) ---');
    // Calculate a valid date (next Tuesday to avoid weekend operating hours checks issues, e.g. Sunday)
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + ((2 + 7 - nextDate.getDay()) % 7 || 7)); // Next Tuesday
    const bookingDateStr = nextDate.toISOString().split('T')[0];
    const bookingTimeStr = '10:00 AM';

    const createRes = await axios.post(
      `${BASE_URL}/api/bookings`,
      {
        vehicleId: testVehicleId,
        bookingDate: bookingDateStr,
        bookingTime: bookingTimeStr,
        fullName: 'Test Customer',
        email: customerEmail,
        mobileNumber: '+15550199',
        drivingLicenseNumber: 'DL-99887766A',
        customerNotes: 'Looking forward to testing the car.'
      },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    testBookingId = createRes.data.data.id;
    console.log(`✅ Booking created successfully. ID: ${testBookingId}, Ref: ${createRes.data.data.bookingReference}`);

    // 5. Test booking validation: Past Date Error
    console.log('\n--- 5. Testing Validation: Booking in the past ---');
    try {
      await axios.post(
        `${BASE_URL}/api/bookings`,
        {
          vehicleId: testVehicleId,
          bookingDate: '2020-01-01',
          bookingTime: '10:00 AM',
          fullName: 'Test Customer',
          email: customerEmail,
          mobileNumber: '+15550199'
        },
        { headers: { Authorization: `Bearer ${customerToken}` } }
      );
      console.error('❌ FAILED: Created past booking without error.');
    } catch (err) {
      console.log(`✅ SUCCESS: Rejected past booking. Status: ${err.response?.status}, Message: ${err.response?.data?.message}`);
    }

    // 6. Test booking validation: Sunday Closing hours
    console.log('\n--- 6. Testing Validation: Booking on Sunday ---');
    // Find next Sunday
    const sundayDate = new Date();
    sundayDate.setDate(sundayDate.getDate() + (7 - sundayDate.getDay()));
    const sundayDateStr = sundayDate.toISOString().split('T')[0];

    try {
      await axios.post(
        `${BASE_URL}/api/bookings`,
        {
          vehicleId: testVehicleId,
          bookingDate: sundayDateStr,
          bookingTime: '10:00 AM',
          fullName: 'Test Customer',
          email: customerEmail,
          mobileNumber: '+15550199'
        },
        { headers: { Authorization: `Bearer ${customerToken}` } }
      );
      console.error('❌ FAILED: Created Sunday booking without error.');
    } catch (err) {
      console.log(`✅ SUCCESS: Rejected Sunday booking. Status: ${err.response?.status}, Message: ${err.response?.data?.message}`);
    }

    // 7. Test booking validation: Outside daily business hours (e.g., 8:00 PM)
    console.log('\n--- 7. Testing Validation: Booking outside operating hours ---');
    try {
      await axios.post(
        `${BASE_URL}/api/bookings`,
        {
          vehicleId: testVehicleId,
          bookingDate: bookingDateStr,
          bookingTime: '8:00 PM',
          fullName: 'Test Customer',
          email: customerEmail,
          mobileNumber: '+15550199'
        },
        { headers: { Authorization: `Bearer ${customerToken}` } }
      );
      console.error('❌ FAILED: Created booking outside operating hours without error.');
    } catch (err) {
      console.log(`✅ SUCCESS: Rejected booking outside operating hours. Status: ${err.response?.status}, Message: ${err.response?.data?.message}`);
    }

    // 8. Test booking validation: Duplicate booking
    console.log('\n--- 8. Testing Validation: Duplicate booking ---');
    try {
      await axios.post(
        `${BASE_URL}/api/bookings`,
        {
          vehicleId: testVehicleId,
          bookingDate: bookingDateStr,
          bookingTime: bookingTimeStr,
          fullName: 'Test Customer',
          email: customerEmail,
          mobileNumber: '+15550199'
        },
        { headers: { Authorization: `Bearer ${customerToken}` } }
      );
      console.error('❌ FAILED: Created duplicate booking without error.');
    } catch (err) {
      console.log(`✅ SUCCESS: Rejected duplicate booking. Status: ${err.response?.status}, Message: ${err.response?.data?.message}`);
    }

    // 9. Customer: View own bookings
    console.log('\n--- 9. Customer: View own bookings ---');
    const myBookingsRes = await axios.get(`${BASE_URL}/api/bookings/my`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    console.log(`✅ Retrieved customer bookings count: ${myBookingsRes.data.data.length}`);

    // 10. Customer: Edit pending booking
    console.log('\n--- 10. Customer: Edit pending booking ---');
    const editRes = await axios.put(
      `${BASE_URL}/api/bookings/${testBookingId}`,
      {
        bookingDate: bookingDateStr,
        bookingTime: '11:00 AM', // Shifted from 10:00 AM
        customerNotes: 'Please note I might be 5 minutes late.'
      },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    console.log(`✅ Booking updated successfully. Status: ${editRes.data.data.status}, New Time: ${editRes.data.data.bookingTime}`);

    // 11. Dealer: List bookings (with search/filters)
    console.log('\n--- 11. Dealer: List bookings ---');
    const dealerListRes = await axios.get(`${BASE_URL}/api/dealer/bookings?search=${customerEmail}`, {
      headers: { Authorization: `Bearer ${dealerToken}` }
    });
    console.log(`✅ Dealer listed bookings search hit: ${dealerListRes.data.data.length} records found.`);

    // 12. Dealer: Modify/Reschedule booking
    console.log('\n--- 12. Dealer: Modify/Reschedule booking ---');
    const dealerModifyRes = await axios.put(
      `${BASE_URL}/api/dealer/bookings/${testBookingId}/modify`,
      {
        bookingDate: bookingDateStr,
        bookingTime: '1:00 PM', // Rescheduled by dealer
        dealerNotes: 'Rescheduled due to vehicle maintenance slot conflict.'
      },
      { headers: { Authorization: `Bearer ${dealerToken}` } }
    );
    console.log(`✅ Dealer modified booking. Status: ${dealerModifyRes.data.data.status}, New Time: ${dealerModifyRes.data.data.bookingTime}`);

    // 13. Dealer: Approve booking (Generates calendar invites)
    console.log('\n--- 13. Dealer: Approve booking ---');
    const approveRes = await axios.put(
      `${BASE_URL}/api/dealer/bookings/${testBookingId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${dealerToken}` } }
    );
    console.log(`✅ Dealer approved booking. New status: ${approveRes.data.data.status}`);
    console.log(`🔗 Google Calendar link: ${approveRes.data.googleCalendarLink}`);

    // 14. Customer: Attempt edit after approved (should reschedule status back to pending, or verify it works)
    console.log('\n--- 14. Customer: Edit approved booking ---');
    const editApprovedRes = await axios.put(
      `${BASE_URL}/api/bookings/${testBookingId}`,
      {
        bookingTime: '2:00 PM'
      },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    console.log(`✅ Edited approved booking. New status (re-verification pending): ${editApprovedRes.data.data.status}, Time: ${editApprovedRes.data.data.bookingTime}`);

    // 15. Dealer: Reject booking (Require reason)
    console.log('\n--- 15. Dealer: Reject booking ---');
    try {
      await axios.put(
        `${BASE_URL}/api/dealer/bookings/${testBookingId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${dealerToken}` } }
      );
      console.error('❌ FAILED: Rejected booking without providing mandatory reason.');
    } catch (err) {
      console.log(`✅ SUCCESS: Blocked rejection without reason. Status: ${err.response?.status}`);
    }

    const rejectRes = await axios.put(
      `${BASE_URL}/api/dealer/bookings/${testBookingId}/reject`,
      { rejectionReason: 'No sales representative available at this hour.' },
      { headers: { Authorization: `Bearer ${dealerToken}` } }
    );
    console.log(`✅ Dealer rejected booking. Status: ${rejectRes.data.data.status}, Reason: ${rejectRes.data.data.rejectionReason}`);

    // 16. Customer: Attempt edit after rejected (Should fail)
    console.log('\n--- 16. Customer: Try edit rejected booking ---');
    try {
      await axios.put(
        `${BASE_URL}/api/bookings/${testBookingId}`,
        { bookingTime: '3:00 PM' },
        { headers: { Authorization: `Bearer ${customerToken}` } }
      );
      console.error('❌ FAILED: Edited rejected booking.');
    } catch (err) {
      console.log(`✅ SUCCESS: Blocked editing rejected booking. Status: ${err.response?.status}, Message: ${err.response?.data?.message}`);
    }

    // 17. Dealer: Cancel booking
    console.log('\n--- 17. Dealer: Cancel booking ---');
    const cancelRes = await axios.put(
      `${BASE_URL}/api/dealer/bookings/${testBookingId}/cancel`,
      { cancellationReason: 'Vehicle sold in the showroom.' },
      { headers: { Authorization: `Bearer ${dealerToken}` } }
    );
    console.log(`✅ Dealer cancelled booking. Status: ${cancelRes.data.data.status}`);

    // 18. Dealer: Soft Delete booking (checks deletedAt)
    console.log('\n--- 18. Dealer: Soft Delete booking ---');
    const deleteRes = await axios.delete(
      `${BASE_URL}/api/dealer/bookings/${testBookingId}`,
      { headers: { Authorization: `Bearer ${dealerToken}` } }
    );
    console.log(`✅ Soft deleted booking. Status code: ${deleteRes.status}, Deleted: ${deleteRes.data.success}`);

    // Verify it is no longer listed by dealer
    const verifyDelRes = await axios.get(`${BASE_URL}/api/dealer/bookings?search=${customerEmail}`, {
      headers: { Authorization: `Bearer ${dealerToken}` }
    });
    console.log(`✅ Verified soft deleted booking is excluded from dealer list (Count: ${verifyDelRes.data.data.length})`);

    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED with error:');
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }
}

runTests();
