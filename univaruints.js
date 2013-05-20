/*****
 * univaruints: variable length integer serialization
 * NOTE:
 * altough javascript is limited to 2^53 (9007199254740992)
 * the maximum number can be used here is 34630287487
 * javascript got limitations on bitwise operators so that only 32-bit are safe
 * also the 32-bit integers are signed in shift operator (we might neeed to use >>>0 trick)
 * see http://stackoverflow.com/questions/1908492/unsigned-integer-in-javascript
 * we might need to use *Math.pow(2,x)
 ****/
// TODO: study typed arrays for optimization
// * http://www.khronos.org/registry/typedarray/specs/latest/
// * http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
// NOTE: you may compare with python-univaruints < http://nemisj.com/python-api-javascript/
// ; for some broken minification
;
var univaruints=function(){
	var self={};
	var shifts=[0, 128, 16512, 2113664, 270549120, 34630287488, 4432676798592, 567382630219904, 72624976668147840];
	var shifts2=shifts.slice(2);
	var pads={1:'\0', 2:'\0\0',3:'\0\0\0'};

    // based on idea from http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
    var ab2str=function(buf) {
       return String.fromCharCode.apply(null, new Uint8Array(buf));
    }
    var str2ab=function(str) {
       var buf = new ArrayBuffer(str.length); // 1 bytes for each char
       var bufView = new Uint8Array(buf);
       for (var i=0, strLen=str.length; i<strLen; i++) {
         bufView[i] = str.charCodeAt(i);
       }
       return buf;
     }

    var n_by_chr_s='\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\1\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\2\3\3\3\3\3\3\3\3\3\3\3\3\3\3\3\3\4\4\4\4\4\4\4\4\5\5\5\5\6\6\7\10';
    var n_by_chr=new Uint8Array(str2ab(n_by_chr_s));

	self.decode_single=function(s) {
		var o=s.charCodeAt(0);
		if ( 128 & o ) {
			// 128>=o
			var n=n_by_chr[o];
			var mask=127>>>n;
			var payload=0;
			for (var i=1; i<=n; i++) {
				payload*=256;
				payload+= s.charCodeAt(i);
			}
			// ( ((o & mask)<<  (n*8)  )>>>0)
			return [n+1, shifts[n] + ( ( (o & mask) * Math.pow(2 , n*8) ) + payload )];
		} else {
			// 128>o
			return [1, o];
		}
	};

    self.encode_single=function(v) {
    	if (v >= 128) {
    		var bisect = new bisection();
    		var n=bisect.bisect_right(shifts2, v)+1;
    		var offset=shifts[n];
    		v-=offset;
    		// NOTE: it seems there is no Uint64 in javascript, even 1<<32 would give 1
    		var buf = new ArrayBuffer(4), dv=new DataView(buf);
    		dv.setUint32(0, v);
    		// 1>>32 gives 1 !!
    		if (n==4) return String.fromCharCode(((65280>>n) & 255) | ( (127>>n) & ( (v / Math.pow(2, n*8 ))>>>0  ) ))
    		   + ab2str(buf).substr(4-n);
    		return String.fromCharCode(((65280>>n) & 255) | ( (127>>n) & (v>> ( n*8 )  ) ))
    		   + ab2str(buf).substr(4-n);
    	} else {
    		// v<128
    		return String.fromCharCode(v);
    	}
	};

	self.decode=function(s) {
	  var a,l=[], n=s.length, offset=0;
	  while(offset<n) {
	    a=self.decode_single(s.substr(offset));
	    offset+=a[0]
	    l.push(a[1]);
	  }
	  return l;
	};
	self.encode=function(l) {
	  var s='',i=0,n=l.length;
	  for(;i<n;++i) {
	    s+=self.encode_single(l[i]);
	  }
	  return s;
	};
	return self;
}();