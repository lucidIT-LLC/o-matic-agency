# Host-worker handoff

The factory's front-line agent owns the request. Background workers retain
their own approved factory gold records and specializations. The Server holds
factory identity and durable coordination; the requesting host provides the
model and any native worker execution. The Server does not acquire or forward
the host's model credentials.

1. Start the named granted factory, use the same conversation key throughout,
   and resolve the worker's active, approved current gold record from that
   factory. Preserve the entire relevant domain and lane boundaries; do not
   substitute a generic "coder" or silently load another factory's persona.
2. Use `kernel_delegate` to record the bounded assignment, target, acceptance
   evidence, and stop condition. The returned delegation ID is a record of
   assignment only, not evidence that a worker ran and not a grant.
3. If the host has native subagent dispatch, actually invoke it. Pass the
   assignment, canonical role information, the factory connection and the
   exact conversation key; give only the tools and context needed and no
   wider access than the host and Server already authorize. The host's model
   runs the work; the provider is the host's choice. Do not transmit tokens.
4. Obtain the worker's evidence and have the admitted worker return it with
   `kernel_return` using the original delegation ID and conversation key.
   Read back the return. The lead checks the result against the assignment.
5. If a native worker or permitted return is unavailable, report the refusal
   or unavailable host capability and leave an honest blocked handoff. Never
   claim that a database delegation row launched a worker. Never manufacture a
   successful return or use a second principal to bypass an authorization.

This is a host-executed path. It does not itself prove automatic server-side
dispatch, independent worker credentials, or support on another host. Each host
must separately demonstrate identity, permissions, actual execution, return,
and negative cases. Existing operator approvals and external publication rules
continue to apply.
