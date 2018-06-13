
  <style>

    .area {
      fill: steelblue;
      clip-path: url(#clip);
    }

    .zoom {
      cursor: move;
      fill: none;
      pointer-events: all;
    }

    .legend, .activateAll {
      font-size: 12px;
    }

    .legend rect, #activateAllRect {
      cursor: pointer;                                              
      stroke-width: 2;
    }

    rect.disabled {                                                 
      fill: transparent !important;                                 
    }

</style>
<script type="text/javascript" src="d3.v4.min.js"></script>
<center>
  <svg width="1080" height="668"></svg>
</center>
<script type="text/javascript" src="MessengerViewer.js"></script>

<br><br><p>Comments, correction and bug reports welcome ;-)</p>