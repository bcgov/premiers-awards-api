/*!
 * API test
 * File: admin.test.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const {api} = require('../app.js');
const supertest = require('supertest');

// test('the data is peanut butter', async () => {
//     const data = await fetchData();
//     expect(data).toBe('peanut butter');
// });
//
// test('the fetch fails with an error', async () => {
//     expect.assertions(1);
//     try {
//         await fetchData();
//     } catch (e) {
//         expect(e).toMatch('error');
//     }
// });


describe('User Endpoints', () => {
    it('GET /user/info should show user details', async () => {
        const res = await supertest(api).get('/admin/users/info');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty("_id");
        expect(res.body).toHaveProperty("email");
        expect(res.body).toHaveProperty("firstname");
        expect(res.body).toHaveProperty("lastname");
        expect(res.body).toHaveProperty("role");
        expect(res.body).toHaveProperty("guid");
    });
});