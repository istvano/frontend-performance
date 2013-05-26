module( "performance" );


test( " check if fetchStart exists ", function () {
	ok(window.performance.timing.fetchStart,"FetchStart is defined");
});

test( " check if loadEventEnd exists ", function () {
    ok(window.performance.timing.loadEventEnd,"loadEventEnd is defined");
});

test( " check if monit exists ", function () {
    ok(window.performance.monit,"monit is defined");
});

/*
test( "a basic test example", function() {
  expect( 1 );
  var value = "hello";
  equal( value, "hello", "We expect value to be hello" );
});
	
module( "group equal test" );	
	
test( "equal test", function() {
  expect( 6 );
  
  equal( 0, 0, "Zero; equal succeeds" );
  equal( "", 0, "Empty, Zero; equal succeeds" );
  equal( "", "", "Empty, Empty; equal succeeds" );
  equal( 0, 0, "Zero, Zero; equal succeeds" );
   
  equal( "three", 3, "Three, 3; equal fails" );
  equal( null, false, "null, false; equal fails" );
  //strictEqual( true, true, "all valid" );
  //ok( true, "valid, third box is checked" );
});
	
module( "deep object test group" );		
	
test( "deepEqual test", function() {
  var obj = { foo: "bar" };
 
  deepEqual( obj, { foo: "bar" }, "Two objects can be the same in value" );
});
*/
//throw Error('Sample exception');