[AC Analysis]
{
   Npanes: 1
   {
      traces: 2 {524290,0,"V(out_amp_real2)"} {524291,0,"V(out_amp2)"}
      X: ('M',0,1,0,1e+06)
      Y[0]: (' ',0,3.16227766016838,10,1e+07)
      Y[1]: (' ',0,-360,30,-90)
      Log: 1 2 0
      PltMag: 1
      PltPhi: 1 0
   }
}
[Transient Analysis]
{
   Npanes: 1
   {
      traces: 6 {524290,0,"V(out_amp_real)"} {524291,0,"V(out_amp_real1)"} {524292,0,"V(out_amp_real2)"} {524293,0,"V(out_amp_real3)"} {524294,0,"V(out_amp_real4)"} {524295,0,"V(ref_v)"}
      X: ('m',1,0,0.0005,0.00499999)
      Y[0]: (' ',1,-0.3,0.3,3.3)
      Y[1]: ('µ',1,1e+308,6e-07,-1e+308)
      Volts: (' ',0,0,1,-0.3,0.3,3.3)
      Log: 0 0 0
   }
}
