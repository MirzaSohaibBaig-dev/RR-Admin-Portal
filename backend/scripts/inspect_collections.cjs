const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb+srv://sadiarafiquedev_db_user:KhmXmAyYP9SxabFR@cluster0.yhrbvje.mongodb.net/ride_and_serve?appName=Cluster0');
  const db = mongoose.connection.client.db('ride_and_serve');
  const cols = await db.listCollections().toArray();
  console.log('Collections in ride_and_serve:');
  for (let c of cols) {
    const count = await db.collection(c.name).countDocuments();
    console.log(` - ${c.name}: ${count} docs`);
  }
  await mongoose.disconnect();
}
test();
