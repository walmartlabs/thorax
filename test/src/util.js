describe('util', function() {
  describe('#tag', function() {
    it('should handle close tags', function() {
      expect(Thorax.Util.tag({tagName: 'div'})).to.equal('<div ></div>');
      expect(Thorax.Util.tag({tagName: 'div'}, 'foo')).to.equal('<div >foo</div>');
    });
    it('should handle void tags', function() {
      expect(Thorax.Util.tag({tagName: 'img'})).to.equal('<img >');
    });
    it('should throw on void tag with content', function() {
      expect(function() {
        Thorax.Util.tag({tagName: 'hr'}, 'something');
      }).to.throwError(/void-tag-content/);
    });
  });
});
