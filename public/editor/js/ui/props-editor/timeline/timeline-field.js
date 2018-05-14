import Pool from "/engine/js/utils/pool.js";
import FieldPlayer from "/engine/js/components/movie-clip/field-player.js";

export const FRAMES_STEP = 3;

const keyframesClasses = [
	'timeline-keyframe timeline-keyframe-smooth',
	'timeline-keyframe timeline-keyframe-linear',
	'timeline-keyframe timeline-keyframe-discrete'
]

var fieldLabelTimelineProps = {className: 'objects-timeline-labels'};
var fieldTimelineProps = {className: 'field-timeline'};


var _scale, _shift;
const scale = (val) => {
	return (_shift - val) * _scale;
}

export default class FieldsTimeline extends React.Component {
	
	constructor(props) {
		super(props);
		this.renderKeyframeChart = this.renderKeyframeChart.bind(this);
	}
	
	static invalidateTimelineCache (field) {
		field.__cacheTimeline = false;
		field.__cacheTimelineRendered = null;
	}
	
	getValueAtTime(time) {
		var field = this.props.field;
		if(!field.__cacheTimeline) {
			var fieldPlayer = Pool.create(FieldPlayer);
			var c = [];
			field.__cacheTimeline = c;
			var wholeTimelineData = editor.selection[0]._timelineData;
			fieldPlayer.init({}, field, wholeTimelineData.p, wholeTimelineData.d);
			fieldPlayer.reset();
			calculateCacheSegmentForField(fieldPlayer, c);
			for(let label in wholeTimelineData.l) {
				label = wholeTimelineData.l[label];
				if(!c.hasOwnProperty(label.t)) { //time at this label is not calculated yet
					fieldPlayer.goto(label.t, label.n[this.props.fieldIndex]);
					calculateCacheSegmentForField(fieldPlayer, c);
				}
			}
			c.min = Math.min.apply(null, c);
			c.max = Math.max.apply(null, c);
			Pool.dispose(fieldPlayer);
		}
		if(field.__cacheTimeline.hasOwnProperty(time)) {
			return field.__cacheTimeline[time];
		} else {
			return false;
		}
	}
	
	renderKeyframeChart(keyFrame) {
		if(keyFrame.n && (keyFrame.t < keyFrame.n.t)) {
			var n = keyFrame.n;
			switch (n.m) {
				case 0:
					var ret = [];
					for(let i = keyFrame.t; i <= n.t; i++) {
						ret.push((i * FRAMES_STEP) + ',' + scale(this.getValueAtTime(i)));
					}
					return ret.join(' ');
				case 1: //linear
					return (n.t * FRAMES_STEP) + ',' + scale(n.v);
				case 2: //discrete
					var v = scale(keyFrame.v);
					var t = n.t * FRAMES_STEP;
					return (keyFrame.t * FRAMES_STEP) + ',' + v + ' ' + t + ',' + v + ' ' + t + ',' + scale(n.v);
			}
		}
		return '';
	}
	
	renderKeyframe(keyFrame) {
		var loopArrow;
		if(keyFrame.j !== keyFrame.t) {
			var len = Math.abs(keyFrame.j - keyFrame.t);
			len *= FRAMES_STEP;
			loopArrow = R.svg({className:'loop-arrow', height:11, width:len},
				R.polyline({points:'0,0 6,6 3,8 0,0 6,9 '+(len/2)+',10 '+(len-3)+',7 '+len+',0'})
			);
		}
		return R.div({key:keyFrame.t, className:keyframesClasses[keyFrame.m], onMouseDown: (ev) => {
				sp(ev);
			},style:{left:keyFrame.t * FRAMES_STEP}},
			loopArrow
		);
	}
	
	render() {
		var field = this.props.field;
		
		var label = R.div(fieldLabelTimelineProps, field.n);
		
		var lastKeyframe = field.t[field.t.length - 1];
		var width = 0;
		if(lastKeyframe) {
			width = Math.max(lastKeyframe.t, lastKeyframe.j);
		}
		width += 300;
		width *= FRAMES_STEP;
		
		this.getValueAtTime(lastKeyframe.t); //cache timeline's values
		_scale = field.__cacheTimeline.max - field.__cacheTimeline.min;
		if(_scale === 0) {
			_scale = 1;
		}
		_scale = 25.0 / _scale;
		_shift = field.__cacheTimeline.max + 1/_scale;
		
		if(!field.__cacheTimelineRendered) {
			field.__cacheTimelineRendered = R.svg({className:'timeline-chart', height:'27', width},
				R.polyline({points:field.t.map(this.renderKeyframeChart).join(' ')})
			)
		}
		
		return R.div(fieldTimelineProps,
			R.div({style:{width}},
				label,
				field.t.map(this.renderKeyframe)
			),
			field.__cacheTimelineRendered
		);
	}
}

const calculateCacheSegmentForField = (fieldPlayer, c) => {
	var time;
	var i = 0;
	var fields = fieldPlayer.timeline;
	var limit = fields[fields.length-1].t;
	while(!c.hasOwnProperty(fieldPlayer.time)) {
		time = fieldPlayer.time;
		if(time > limit) {
			break;
		}
		fieldPlayer.update();
		c[time] = fieldPlayer.val;
		assert(i++ < 100000, 'Timeline values cache calculation looped and failed.');
	}
}