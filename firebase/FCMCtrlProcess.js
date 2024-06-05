const log = require( '../component/Log' )( 'FCMCtrlProcess' )
const FBAdmin = require( 'firebase-admin' )

ns = {}

ns.FCMCtrlProcess = function() {
	const self = this
	self.init()
}

ns.FCMCtrlProcess.prototype.init = function() {
	const self = this;
	// process
	const jConf = process.argv[ 2 ];
	const fbConf = JSON.parse( jConf )
	log( 'init', fbConf )
	self.fbConf = fbConf
	process.on( 'message', e => self.onMessage( e ))
	
	self.ping = setInterval( ping, 5000 )
	function ping() {
		process.send( 'ping' )
	}
	
	// firebase
	const serviceAccount = require( fbConf.serviceAccountPath )
	log( 'serviceAccount', serviceAccount )
	self.firebase = FBAdmin.initializeApp({
		credential : FBAdmin.credential.cert( serviceAccount ),
	})
	self.msg = self.firebase.messaging()
	log( 'msg', self.msg )
}

ns.FCMCtrlProcess.prototype.onMessage = function( event ) {
	const self = this
	if ( 'exit' == event ) {
		self.exit()
		return
	}
	
	if ( 'send' == event.type ) {
		self.handlePush( event.data )
		return
	}
	
	log( 'onMessage - unknwon', event )
}

ns.FCMCtrlProcess.prototype.exit = function() {
	const self = this
	clearInterval( self.ping )
	process.exit( 0 )
}

ns.FCMCtrlProcess.prototype.sendPushie = async function( pushMsg, tokens ) {
	const self = this;
	log( 'sendPushie', [ pushMsg, tokens ], 3 )
	
	if ( tokens ) {
		jMsg = JSON.stringify( pushMsg )
		const all = tokens.map( token => {
			const msg = JSON.parse( jMsg )
			msg.token = token
			
			return msg
		})
		log( 'all', all )
		const res = await self.msg.sendAll( all )
		log( 'result', res )
		return
	}
	
	log( 'NYI', [ pushMsg, tokens ])
}

ns.FCMCtrlProcess.prototype.handlePush = function( conf ) {
	const self = this
	const msg = {
		notification : self.buildNotie( conf ),
		data         : conf.data,
	}
	
	msg.android = self.buildAndy( conf )
	
	// enable when needed
	//msg.apns = self.buildAPNS( conf )
	
	log( 'pushie', msg )
	self.sendPushie( msg, conf.tokens )
}

ns.FCMCtrlProcess.prototype.buildAndy = function( conf ) {
	const self = this;
	const a = conf.android
	const n = {
		collapse_key : 'no.doorman.andy',
		priority     : 'high',
		notification : {
			sound                 : 'default',
			channel_id            : 'all_notifications',
			notification_priority : 'PRIORITY_HIGH'
		},
	}
	
	log( 'buildAndy', n )
	return n
}

ns.FCMCtrlProcess.prototype.buildAPNS = function( conf ) {
	const self = this
	const i = conf.ios
	const n = {
	}
	
	log( 'buildAPNS', n )
	return n
}

ns.FCMCtrlProcess.prototype.buildNotie = function( conf ) {
	const n = conf.notification
	return {
		title : n.title,
		body  : n.body,
	}
}

new ns.FCMCtrlProcess()

