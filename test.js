Papa.parse('MMI_test.xyz', {
  download: true,
  delimiter: " ",
  dynamicTyping: true,
	complete: function(results) {
		console.log(results);
	}
});
