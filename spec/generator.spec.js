var util = require("util");
var fs = require("fs");
var child_process = require("child_process");
var generator = require("../lib/generator.js");

describe("registering a renderer", function(){
  it("adds the renderer to registered renderers", function(){
    generator.registerRenderer("sample", "../spec/sample_renderer"); 

    expect(generator.registeredRenderers["sample"].name).toEqual("sample renderer");
  }); 
});

describe("registering a parser", function(){
  it("adds the parser to registered parsers", function(){
    generator.registerParser("sample", "../spec/sample_parser"); 

    expect(generator.registeredParsers["sample"].name).toEqual("sample parser");
  });
});

describe("returning an instance of renderer", function(){
  var fake_renderer = jasmine.createSpy();
  generator.registeredRenderers["sample"] = fake_renderer;

  expect(generator.rendererFor("sample") instanceof fake_renderer).toBeTruthy();
});

describe("returning an instance of parser", function(){
  var fake_parser = jasmine.createSpy();
  generator.registeredParsers["sample"] = fake_parser;

  expect(generator.parserFor("sample") instanceof fake_parser).toBeTruthy();
});

describe("starting the generation", function(){
  
  it("sets the config", function(){
    var supplied_config = {sample: "test"};

    spyOn(generator, "prepareOutputDirectory");

    generator.generate(supplied_config);

    expect(generator.config.sample).toEqual("test");

  });

  it("calls to prepare output directory if no on start function is provided", function(){

    var supplied_config = {sample: "test"};

    spyOn(generator, "prepareOutputDirectory");

    generator.generate(supplied_config);

    expect(generator.prepareOutputDirectory).toHaveBeenCalled();

  });

  it("calls the on start function with next action as a callback", function(){
 
    var on_start = jasmine.createSpy();

    var supplied_config = {sample: "test", "on_start": on_start};

    spyOn(generator, "prepareOutputDirectory");

    generator.generate(supplied_config);

    expect(on_start).toHaveBeenCalled();
 
  });

  it("sets the on complete callback", function(){
  
    var on_complete = jasmine.createSpy();

    var supplied_config = {sample: "test", "on_complete": on_complete};

    spyOn(generator, "prepareOutputDirectory");

    generator.generate(supplied_config);

    expect(generator.onComplete).toEqual(on_complete);
 
  });

  it("sets the after each callback", function(){
  
    var on_each = jasmine.createSpy();

    var supplied_config = {sample: "test", "on_each": on_each};

    spyOn(generator, "prepareOutputDirectory");

    generator.generate(supplied_config);

    expect(generator.onEach).toEqual(on_each);
 
  });

});

describe("prepare output directory", function(){

  it("creates the output directory if it doesn't exist", function(){

    generator.config = {"template_dir": "templates"}; 

    spyOn(fs, 'stat').andCallFake(function(path, callback){
      callback(null, {isDirectory: function(){ return false }} );
    });

    spyOn(generator, "traverseTemplates");
    spyOn(fs, "mkdirSync");

    generator.prepareOutputDirectory();

    expect(fs.mkdirSync).toHaveBeenCalled();

  });

  it("will not create the output directory if it exists", function(){
    generator.config = {"template_dir": "templates"}; 

    spyOn(fs, 'stat').andCallFake(function(path, callback){
      callback(null, {isDirectory: function(){ return true }} );
    });

    spyOn(generator, "traverseTemplates");
    spyOn(fs, "mkdirSync");

    generator.prepareOutputDirectory();

    expect(fs.mkdirSync).not.toHaveBeenCalled();

  });

  it("it calls to traverse templates", function(){
    generator.config = {"template_dir": "templates"}; 

    spyOn(fs, 'stat').andCallFake(function(path, callback){
      callback(null, {isDirectory: function(){ return true }} );
    });

    spyOn(generator, "traverseTemplates");

    generator.prepareOutputDirectory();

    expect(generator.traverseTemplates).toHaveBeenCalled();

  });

});

describe("traversing templates", function() {

  it("traverses recursively", function(){
    generator.config = {"template_dir": "templates"}; 

    spyOn(fs, 'readdir').andCallFake(function(path, callback){
      if(fs.readdir.mostRecentCall.args[0] === "templates"){
        callback(null, ["index.mustache", "sub_dir"]); 
      } else {
        callback(null, ["sub.mustache"]); 
      }
    });

    spyOn(fs, 'mkdirSync');
    spyOn(generator, "fetchAndRender");

    generator.traverseTemplates();

    expect(generator.fetchAndRender).toHaveBeenCalledWith("templates/sub_dir/sub.mustache");

  });

  it("creates sub-directories in the output path", function(){
    generator.config = {"template_dir": "templates", "output_dir": "public"}; 

    spyOn(fs, 'mkdirSync');
    spyOn(generator, "fetchAndRender");

    spyOn(fs, 'readdir').andCallFake(function(path, callback){
      if(fs.readdir.mostRecentCall.args[0] === "templates"){
        callback(null, ["index.mustache", "sub_dir"]); 
      } else {
        callback(null, ["sub.mustache"]); 
      }
    });

    generator.traverseTemplates();

    expect(fs.mkdirSync).toHaveBeenCalledWith("public/sub_dir");

  });

  it("calls to render content when a template is found", function(){
    generator.config = {"template_dir": "templates"}; 

    spyOn(fs, 'readdir').andCallFake(function(path, callback){
      if(fs.readdir.mostRecentCall.args[0] === "templates"){
        callback(null, ["test.html.mustache"]); 
      } else {
        callback("Not a directory", null); 
      }
    });

    spyOn(fs, 'mkdirSync');
    spyOn(generator, "fetchAndRender");

    generator.traverseTemplates();

    expect(generator.fetchAndRender).toHaveBeenCalledWith("templates/test.html.mustache");

  });

  it("skips partial templates from rendering", function(){
    generator.config = {"template_dir": "templates"}; 

    spyOn(fs, 'readdir').andCallFake(function(path, callback){
      if(fs.readdir.mostRecentCall.args[0] === "templates"){
        callback(null, ["_test.html.mustache"]); 
      } else {
        callback("Not a directory", null); 
      }
    });

    spyOn(fs, 'mkdirSync');
    spyOn(generator, "fetchAndRender");

    generator.traverseTemplates();

    expect(generator.fetchAndRender).not.toHaveBeenCalled();


  });

  it("handle other file types as static files", function() {
    generator.config = {"template_dir": "templates", "output_dir": "public"}; 

    spyOn(fs, 'readdir').andCallFake(function(path, callback){
      if(fs.readdir.mostRecentCall.args[0] === "templates"){
        callback(null, ["index.html"]); 
      } else {
        callback({errno: 27, code: 'ENOTDIR'}, null); 
      }
    });

    spyOn(fs, 'mkdirSync');
    spyOn(generator, "staticFileHandler");

    generator.traverseTemplates();

    expect(generator.staticFileHandler).toHaveBeenCalledWith("templates/index.html");

  });

  it("handle the file as a static file if the template extension is not at the end", function() {
    generator.config = {"template_dir": "templates", "output_dir": "public"}; 

    spyOn(fs, 'readdir').andCallFake(function(path, callback){
      if(fs.readdir.mostRecentCall.args[0] === "templates"){
        callback(null, ["index.mustache.swp"]); 
      } else {
        callback({errno: 27, code: 'ENOTDIR'}, null); 
      }
    });

    spyOn(fs, 'mkdirSync');
    spyOn(generator, "staticFileHandler");

    generator.traverseTemplates();

    expect(generator.staticFileHandler).toHaveBeenCalledWith("templates/index.mustache.swp");

  });


});

describe("handling static files", function(){

  it("throws an exception if an error occurrs", function(){
    //TODO: Add the test
  });

  it("issues the copy command with correct source and destination", function(){
 
    spyOn(child_process, "exec").andCallFake(function(cmd, callback){
      callback(); 
    });

    spyOn(generator, "decrementAndCompleteRunningActions");

    generator.staticFileHandler("templates/sub/foo/static.html", {"output_dir": "public"});

    expect(child_process.exec.mostRecentCall.args[0]).toEqual("cp templates/sub/foo/static.html public/sub/foo/static.html");
  });

  it("increments the running actions when issuing copy command", function(){

    spyOn(generator, "incrementRunningActions");

    spyOn(child_process, "exec");

    generator.staticFileHandler("templates/sub/foo/static.html", {"output_dir": "public"});

    expect(generator.incrementRunningActions).toHaveBeenCalled();
  });

  it("decrements the running actions on completion of copy command", function(){

    spyOn(generator, "decrementAndCompleteRunningActions");

    spyOn(child_process, "exec").andCallFake(function(cmd, callback){
      callback(); 
    });

    generator.staticFileHandler("templates/sub/foo/static.html", {"output_dir": "public"});

    expect(generator.decrementAndCompleteRunningActions).toHaveBeenCalled();

  });

  it("exectues on each callback after copy", function(){

    generator.onEach = jasmine.createSpy();

    spyOn(child_process, "exec").andCallFake(function(cmd, callback){
      callback(); 
    });

    generator.staticFileHandler("templates/sub/foo/static.html", {"output_dir": "public"});

    expect(generator.onEach).toHaveBeenCalled();
 
  });

});

describe("rendering content", function(){

  it("instantiates a new renderer", function(){
    generator.config = {};

    spyOn(generator, "rendererFor").andCallFake(function(){ return {"afterRender": null }}); 
    spyOn(generator, "fetchTemplate"); 
    spyOn(generator, "fetchSharedContent"); 
    spyOn(generator, "fetchPartials"); 

    generator.fetchAndRender("templates/sub/simple.mustache");

    expect(generator.rendererFor.mostRecentCall.args[0]).toEqual("mustache");

  });

  it("fetches the template from the path", function(){
    generator.config = {};

    spyOn(generator, "rendererFor").andCallFake(function(){ return {"afterRender": null }}); 
    spyOn(generator, "fetchTemplate"); 
    spyOn(generator, "fetchContent"); 
    spyOn(generator, "fetchPartials"); 

    generator.fetchAndRender("templates/sub/simple.mustache");

    expect(generator.fetchTemplate.mostRecentCall.args[0]).toEqual("templates/sub/simple.mustache");

  });

  it("fetches shared content", function(){
    generator.config = {"content_dir": "contents", "shared_content": "shared"};

    spyOn(generator, "rendererFor").andCallFake(function(){ return {"afterRender": null }}); 
    spyOn(generator, "fetchTemplate"); 
    spyOn(generator, "fetchSharedContent"); 
    spyOn(generator, "fetchPartials"); 

    generator.fetchAndRender("templates/sub/simple.mustache");

    expect(generator.fetchSharedContent.mostRecentCall.args[0]).toEqual("contents/shared");

  });

  it("fetches content for the template", function(){
    generator.config = {"content_dir": "contents", "shared_content": "shared"};

    spyOn(generator, "rendererFor").andCallFake(function(){ return {"afterRender": null, "setContent": function(){} }}); 
    spyOn(generator, "fetchTemplate"); 
    spyOn(generator, "fetchSharedContent").andCallFake(function(path, callback){ callback({}); }); 
    spyOn(generator, "fetchContent"); 
    spyOn(generator, "fetchPartials"); 

    generator.fetchAndRender("templates/sub/simple.html.mustache");

    expect(generator.fetchContent.mostRecentCall.args[0]).toEqual("contents/sub/simple");
  });

  it("fetches partials for the template", function(){
    generator.config = {"template_dir": "templates"};

    spyOn(generator, "rendererFor").andCallFake(function(){ return {"afterRender": null }}); 
    spyOn(generator, "fetchTemplate"); 
    spyOn(generator, "fetchSharedContent"); 
    spyOn(generator, "fetchPartials"); 

    generator.fetchAndRender("templates/sub/simple.mustache");

    expect(generator.fetchPartials.mostRecentCall.args[0]).toEqual("templates/sub");

  });

  it("increments the running actions", function(){
    generator.config = {"template_dir": "templates"};

    spyOn(generator, "rendererFor").andCallFake(function(){ return {"afterRender": null }}); 
    spyOn(generator, "fetchTemplate"); 
    spyOn(generator, "fetchSharedContent"); 
    spyOn(generator, "fetchPartials"); 

    spyOn(generator, "incrementRunningActions");

    generator.fetchAndRender("templates/sub/simple.mustache");

    expect(generator.incrementRunningActions).toHaveBeenCalled();

  });

  it("saves the output after render", function(){

    generator.config = {"output_dir": "public", "output_extension": "html"};

    var fake_renderer = {
      afterRender: null    
    };

    spyOn(generator, "rendererFor").andCallFake(function(){
      return fake_renderer;
    });  

    spyOn(generator, "fetchTemplate"); 
    spyOn(generator, "fetchSharedContent"); 
    spyOn(generator, "fetchPartials"); 

    spyOn(fs, "stat").andCallFake(function(path, callback){
      var fake_stats = {isDirectory: function(){ return true; }};  
      callback(null, fake_stats);
    });
    spyOn(fs, "writeFile");

    generator.fetchAndRender("templates/sub/simple.mustache");

    fake_renderer.afterRender("sample output");

    expect(fs.writeFile.mostRecentCall.args.slice(0, 2)).toEqual(["public/sub/simple.html", "sample output"]);
  });

  it("will not set the extension if rendered file already got an extension", function(){

    generator.config = {"output_dir": "public", "output_extension": "html"};

    var fake_renderer = {
      afterRender: null    
    };

    spyOn(generator, "rendererFor").andCallFake(function(){
      return fake_renderer;
    });  

    spyOn(generator, "fetchTemplate"); 
    spyOn(generator, "fetchSharedContent"); 
    spyOn(generator, "fetchPartials"); 

    spyOn(fs, "stat").andCallFake(function(path, callback){
      var fake_stats = {isDirectory: function(){ return true; }};  
      callback(null, fake_stats);
    });
    spyOn(fs, "writeFile");

    generator.fetchAndRender("templates/sub/simple.css.mustache");

    fake_renderer.afterRender("sample output");

    expect(fs.writeFile.mostRecentCall.args.slice(0, 2)).toEqual(["public/sub/simple.css", "sample output"]);
  });

  it("decrements the running actions after render", function(){
  
    generator.config = {"output_dir": "public", "output_extension": "html"};

    var fake_renderer = {
      afterRender: null    
    };

    spyOn(generator, "rendererFor").andCallFake(function(){
      return fake_renderer;
    });  

    spyOn(generator, "fetchTemplate"); 
    spyOn(generator, "fetchSharedContent"); 
    spyOn(generator, "fetchPartials"); 

    spyOn(fs, "stat").andCallFake(function(path, callback){
      var fake_stats = {isDirectory: function(){ return true; }};  
      callback(null, fake_stats);
    });

    spyOn(fs, "writeFile").andCallFake(function(output_file, output, cbk){
      cbk(null); 
    });

    spyOn(generator, "decrementAndCompleteRunningActions");

    generator.fetchAndRender("templates/sub/simple.css.mustache");

    fake_renderer.afterRender("sample output");

    expect(generator.decrementAndCompleteRunningActions).toHaveBeenCalled();

  });

  it("executes on each callback after a render", function(){
  
    generator.config = {"output_dir": "public", "output_extension": "html"};
    generator.onEach = jasmine.createSpy();

    var fake_renderer = {
      afterRender: null    
    };

    spyOn(generator, "rendererFor").andCallFake(function(){
      return fake_renderer;
    });  

    spyOn(generator, "fetchTemplate"); 
    spyOn(generator, "fetchSharedContent"); 
    spyOn(generator, "fetchPartials"); 

    spyOn(fs, "stat").andCallFake(function(path, callback){
      var fake_stats = {isDirectory: function(){ return true; }};  
      callback(null, fake_stats);
    });

    spyOn(fs, "writeFile").andCallFake(function(output_file, output, cbk){
      cbk(null); 
    });

    generator.fetchAndRender("templates/sub/simple.css.mustache");

    fake_renderer.afterRender("sample output");

    expect(generator.onEach).toHaveBeenCalled();

  });

});

describe("fetching partials", function(){

  it("fetches partials from ancestors", function(){
    spyOn(generator, "fetchPartialsWithCache"); 

    generator.fetchPartials("templates/sub/sub2", function(){ });

    expect(generator.fetchPartialsWithCache.callCount).toEqual(3);
  }); 

  it("invokes the callback with collected partials", function(){
    var output = null; 

    spyOn(generator, "fetchPartialsWithCache").andCallFake(function(path, callback){
      var key = path.split("/").pop();
      var output = {};
      output[key] = "bar"
      callback(output); 
    });

    generator.fetchPartials("templates/sub/sub2", function(partials){
      output = partials
    });

    waits(100);

    runs(function(){
      expect(output).toEqual({"templates": "bar", "sub": "bar", "sub2": "bar"}); 
    });
  });

});

describe("fetching partials with cache", function(){

  it("if a partial is already fetched it's served from the cache", function(){
    var partials = {"_test": "partial"};
    generator.partials["templates/sub/sub1"] = partials;

    spyOn(generator, "fetchPartialsInDir");

    generator.fetchPartialsWithCache("templates/sub/sub1", function(){ }); 

    expect(generator.fetchPartialsInDir).not.toHaveBeenCalled();

  }); 

  it("joins the queue if a partial is currently being fetched", function(){

    var callback_func = function(){};

    generator.partials = {};
    generator.callbacksForPartial = { "templates/sub/sub1": [ function(){} ] };

    generator.fetchPartialsWithCache("templates/sub/sub1", callback_func); 

    expect(generator.callbacksForPartial["templates/sub/sub1"][1]).toEqual(callback_func);

  });

  it("caches fetched partials", function(){

    var partials = {"_test": "partial"};

    generator.partials = {};
    generator.callbacksForPartial = {};

    spyOn(generator, "fetchPartialsInDir").andCallFake(function(path, callback){
      callback(partials); 
    })

    generator.fetchPartialsWithCache("templates/sub/sub1", function(){ }); 

    expect(generator.partials["templates/sub/sub1"]).toEqual(partials);
  });

  it("invokes pending callbacks after the partials are fetched", function(){
    var output = [];

    generator.partials = {};
    generator.callbacksForPartial = {};

    spyOn(generator, "fetchPartialsInDir").andCallFake(function(path, callback){
      setTimeout(function () {
        callback({}); 
      }, 200);
    });
    
    generator.fetchPartialsWithCache("templates/sub/sub1", function(){ output.push("first"); }); 
    generator.fetchPartialsWithCache("templates/sub/sub1", function(){ output.push("second"); }); 

    waits(200);

    runs(function(){
      expect(output).toEqual(["first", "second"]); 
    });

  });
});

describe("fetching partials from the directory", function(){

  it("returns an empty object if there's an error in reading path", function(){
    var output = null;

    spyOn(fs, "readdir").andCallFake(function(path, callback){
      callback("error", null); 
    }); 

    generator.fetchPartialsInDir("templates/sub", function(partials){
      output = partials; 
    });

    expect(output).toEqual({});
  });

  it("returns an empty object if there's no partials in the path", function(){
    var output = null;

    spyOn(fs, "readdir").andCallFake(function(path, callback){
      callback(null, ["index.mustache"]); 
    }); 

    generator.fetchPartialsInDir("templates/sub", function(partials){
      output = partials; 
    });

    expect(output).toEqual({});
  });

  it("fetches the template for each partial available in path", function(){

    spyOn(fs, "readdir").andCallFake(function(path, callback){
      callback(null, ["test.mustache", "_test.html", "_test.mustache", "_foo.mustache"]); 
    });
     
    spyOn(generator, "fetchTemplate"); 

    generator.fetchPartialsInDir("templates/sub", function(){ });

    expect(generator.fetchTemplate.callCount).toEqual(2);
  });

  it("invokes the callback with partials", function(){

    var output = null;

    spyOn(fs, "readdir").andCallFake(function(path, callback){
      callback(null, ["test.mustache", "_test.html", "_test.mustache", "_foo.mustache"]); 
    });
     
    spyOn(generator, "fetchTemplate").andCallFake(function(path, callback){
      callback(null, "sample");  
    }); 

    generator.fetchPartialsInDir("templates/sub", function(partials){ 
      output = partials 
    });

    waits(100);

    runs(function(){
      expect(output).toEqual({ "test": "sample", "foo": "sample" });
    });
  });

});

describe("fetching templates", function(){

  it("fetches the template from path", function(){

    spyOn(fs, 'readFile')

    generator.fetchTemplate("templates/simple.mustache", function(){});

    expect(fs.readFile).toHaveBeenCalled();

  });

  it("passes the template content in the callback", function(){

    var sample_template = "sample template";
    var output = null;
 
    spyOn(fs, 'readFile').andCallFake(function(path, callback){
      callback(null, new Buffer(sample_template)); 
    });

    generator.fetchTemplate("templates/simple.mustache", function(error, template){
      output =  template;
    });

    waits(100);

    runs(function(){
      expect(output).toEqual(sample_template);
    });
 
  });

  it("on an error, pass the error in the callback", function(){

    var error = "error";
    var output = null;
 
    spyOn(fs, 'readFile').andCallFake(function(path, callback){
      callback(error, null); 
    });

    generator.fetchTemplate("templates/simple.mustache", function(error, template){
      output = error;
    });

    waits(100);

    runs(function(){
      expect(output).toEqual(error);
    });
 
  });

});

describe("fetching content", function(){

  it("fetches content from the JSON file of given name", function(){

    var sample_json = {"foo": "bar"};
    var output = null;

    spyOn(fs, 'readFile').andCallFake(function(path, callback){
      callback(null, new Buffer(JSON.stringify(sample_json))); 
    });

    spyOn(generator, "fetchContentFromDir").andCallFake(function(path, callback){
      callback("no directory"); 
    });

    generator.fetchContent("contents/simple", function(content){
      output = content;
    });

    waits(100);

    runs(function(){
      expect(output).toEqual(sample_json);
    });

  });

  it("fetches content from the directory of given name", function(){

    var sample_json = {"foo": "bar"};
    var output = null;

    spyOn(fs, 'readFile').andCallFake(function(path, callback){
      callback(null, new Buffer(JSON.stringify(sample_json))); 
    });

    spyOn(generator, "fetchContentFromDir").andCallFake(function(path, callback){
      callback(null, {"bar": "baz"}); 
    });

    generator.fetchContent("contents/simple", function(content){
      output = content;
    });

    waits(100);

    runs(function(){
      expect(output).toEqual({"foo": "bar", "bar": "baz"});
    });

  });

  it("when no content to fetch empty object is returned", function(){

    var output = null;

    spyOn(fs, 'readFile').andCallFake(function(path, callback){
      callback("file doesn't exist", null); 
    });

    spyOn(generator, "fetchContentFromDir").andCallFake(function(path, callback){
      callback("no directory"); 
    });

    generator.fetchContent("contents/simple", function(content){
      output = content;
    });

    waits(100);

    runs(function(){
      expect(output).toEqual({});
    });

  });

});

describe("fetch content from a directory", function(){

  it("traverses files in the given content directory", function(){

    spyOn(fs, 'readdir');

    generator.fetchContentFromDir("contents/simple", function(){ });

    expect(fs.readdir.mostRecentCall.args[0]).toEqual("contents/simple");

  });

  it("parses JSON files directly", function(){

    var sample_json = {"foo": "bar"};
    var output = null;
 
    spyOn(fs, 'readdir').andCallFake(function(path, callback){
      callback(null, ["test.json", "test2.json"]); 
    });

    spyOn(fs, 'readFile').andCallFake(function(path, callback){
      callback(null, new Buffer(JSON.stringify(sample_json))); 
    });

    generator.fetchContentFromDir("contents/simple", function(error, content){
      output = content;
    });

    waits(100);

    runs(function(){
      expect(output).toEqual({"test": {"foo": "bar"}, "test2": {"foo": "bar"}});
    });
 
  });

  it("calls for the relavent parser for other content types", function(){
    var output = null;
 
    spyOn(fs, 'readdir').andCallFake(function(path, callback){
      callback(null, ["test.markdown"]); 
    });

    spyOn(fs, 'readFile').andCallFake(function(path, callback){
      callback(null, new Buffer("sample content")); 
    });

    spyOn(generator, 'parserFor').andCallFake(function(content_type){
      return {parse: function(data, callback){ callback(data.toString()); }}
    });

    generator.fetchContentFromDir("contents/simple", function(error, content){
      output = content;
    });

    waits(100);

    runs(function(){
      expect(output).toEqual({"test": "sample content"});
    });
 

  });

  it("ignores hidden files", function(){
    var output = null;
 
    spyOn(fs, 'readdir').andCallFake(function(path, callback){
      callback(null, ["test.markdown", ".hidden"]); 
    });

    spyOn(fs, 'readFile');

    generator.fetchContentFromDir("contents/simple", function(){});

    expect(fs.readFile.callCount).toEqual(1);

  });

  it("on an error, pass the error in the callback", function(){

    var error = "error";
    var output = null;
 
    spyOn(fs, 'readdir').andCallFake(function(path, callback){
      callback(error, null); 
    });

    generator.fetchContentFromDir("contents/simple", function(error, content){
      output = error;
    });

    waits(100);

    runs(function(){
      expect(output).toEqual(error);
    });
 
  });

});

