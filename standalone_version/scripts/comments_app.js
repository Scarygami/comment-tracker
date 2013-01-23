/**
 * Copyright (c) 2011-2012 Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License
 */

(function (global) {
  "use strict";

  var $ = global.$, commentTracker;

  Date.prototype.niceDate = function () {
    var y, m, d, h, min, sec, now;
    now = new Date();
    y = this.getFullYear().toString();
    m = (this.getMonth() + 1).toString();
    d = this.getDate().toString();
    h = this.getHours().toString();
    min = this.getMinutes().toString();
    sec = this.getSeconds().toString();
    if (this.getFullYear() === now.getFullYear() && this.getMonth() === now.getMonth() && this.getDate() === now.getDate()) {
      return (h[1] ? h : "0" + h[0]) + ":" + (min[1] ? min : "0" + min[0]);
    }
    return y + "-" + (m[1] ? m : "0" + m[0]) + "-" + (d[1] ? d : "0" + d[0]) + " " + (h[1] ? h : "0" + h[0]) + ":" + (min[1] ? min : "0" + min[0]);
  };

  function CommentTracker() {
    var
      posts, color_count, comments, oldest_first, apiKey, ytApiKey,
      PLUS_POST, YT_POST, PLUS_SEARCH, TWITTER_SEARCH,
      use_colors, imgUrl, search_id, show_hidden, add_url, add_post, tracker_url, search, video_id;

    tracker_url = "http://www.allmyplus.com/hangout-comment-tracker/app.html";
    color_count = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    posts = [];
    comments = [];
    oldest_first = false;
    PLUS_POST = 1;
    YT_POST = 2;
    PLUS_SEARCH = 3;
    TWITTER_SEARCH = 4;
    use_colors = true;
    search_id = 1;
    show_hidden = false;

    function comment_sort(a, b) {
      return a.published.getTime() - b.published.getTime();
    }

    function strip_html(html) {
      var tmp = global.document.createElement("div");
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText;
    }

    function Comment(post, comment_id, author_name, author_pic, published, updated, content, url, activity_id) {
      this.post = post;
      this.url = url || this.post.url;
      this.activity_id = activity_id;
      this.comment_id = comment_id.replace(/\W/gi, "_");
      this.author_name = author_name;
      this.author_pic = author_pic;
      this.published = published;
      this.updated = updated;
      this.content = content;
      this.chk_delete = false;
      this.chk_deleted = false;
      this.chk_updated = false;
      this.chk_found = true;
      this.chk_hidden = false;
      this.chk_pinned = false;

      this.get_contents = function () {
        var str_comment = "", str_classes = "ct-comment";
        if (this.chk_pinned) {
          str_classes += " ct-important";
        }
        if (this.chk_hidden) {
          str_classes += " ct-hidden";
        }
        if (use_colors) {
          str_classes += " ct-background-" + this.post.color;
        } else {
          str_classes += " ct-background-0";
        }
        str_comment += "<div id=\"" + this.comment_id + "\" class=\"" + str_classes + "\">";
        str_comment += "<div class=\"ct-actions\">";
        if (this.post.post_type === PLUS_SEARCH) {
          str_comment += "<div class=\"ct-action ct-action_track\" title=\"Track comments\"></div>";
        }
        str_comment += "<div class=\"ct-action ct-action_hide\"" + (this.chk_hidden ? "style=\"display: none\"" : "") + " title=\"Hide\"></div>";
        str_comment += "<div class=\"ct-action ct-action_unhide\"" + (this.chk_hidden ? "" : "style=\"display: none\"") + " title=\"Unhide\"></div>";
        str_comment += "<div class=\"ct-action ct-action_pin\"" + (this.chk_pinned ? "style=\"display: none\"" : "") + " title=\"Pin\"></div>";
        str_comment += "<div class=\"ct-action ct-action_unpin\"" + (this.chk_pinned ? "" : "style=\"display: none\"") + " title=\"Unpin\"></div>";
        str_comment += "</div>";
        str_comment += "<img class=\"ct-comment_pic\" src=\"" + this.author_pic + "\">\n";
        str_comment += "<img class=\"ct-service_pic\" src=\"" + this.post.service_pic + "\">\n";
        str_comment += "<div class=\"ct-comment_time\"><a href=\"" + this.url + "\" target=\"_blank\">" + this.published.niceDate() + "</a></div>";
        str_comment += "<b>" + this.author_name + "</b><br>";
        str_comment += "<div class=\"ct-comment_text\">" + this.content + "</div></div>";
        return str_comment;
      };

      this.recolor = function (useColor) {
        var style = "ct-background-" + this.post.color;
        $("#" + this.comment_id).removeClass("ct-background-0");
        $("#" + this.comment_id).removeClass(style);
        if (useColor) {
          $("#" + this.comment_id).addClass(style);
        } else {
          $("#" + this.comment_id).addClass("ct-background-0");
        }
      };
    }

    function remove_comment(id) {
      global.setTimeout(function () {
        $("#" + id).fadeOut(1000, function () {
          $("#" + id).remove();
        });
      }, 5000);
    }


    function find_before(c) {
      var i, l, before;
      before = -1;
      l = comments.length;
      for (i = l - 1; i >= 0; i--) {
        if (comments[i].chk_pinned === c.chk_pinned && comments[i].comment_id !== c.comment_id) {
          if (comments[i].published.getTime() <= c.published.getTime()) {
            before = i;
            break;
          }
        }
      }
      return before;
    }

    function move_comment(comment) {
      var div_id, before;
      div_id = "#" + comment.comment_id;
      if ($(div_id) && $(div_id).length > 0) {
        before = find_before(comment);
        if (oldest_first) {
          if (before >= 0 && $("#" + comments[before].comment_id).length > 0) {
            $("#" + comments[before].comment_id).after($(div_id));
          } else {
            if (comment.chk_pinned) {
              $("#ct-comments_pinned").prepend($(div_id));
            } else {
              $("#ct-comments_unpinned").prepend($(div_id));
            }
          }
        } else {
          if (before >= 0 && $("#" + comments[before].comment_id).length > 0) {
            $("#" + comments[before].comment_id).before($(div_id));
          } else {
            if (comment.chk_pinned) {
              $("#ct-comments_pinned").append($(div_id));
            } else {
              $("#ct-comments_unpinned").append($(div_id));
            }
          }
        }
      }
    }

    function create_comment_actions(comment) {
      var div_id;
      div_id = "#" + comment.comment_id;
      $(div_id + " a").prop("target", "_blank");
      if (comment.post.post_type === PLUS_SEARCH) {
        $(div_id + " .ct-action_track").click(function () {
          add_post(comment.activity_id);
          $(div_id + " .ct-action_track").hide();
        });
      }
      $(div_id + " .ct-action_pin").click(function () {
        comment.chk_pinned = true;
        $(div_id).addClass("ct-important");
        $(div_id + " .ct-action_pin").hide();
        $(div_id + " .ct-action_unpin").show();
        move_comment(comment);
      });
      $(div_id + " .ct-action_unpin").click(function () {
        comment.chk_pinned = false;
        $(div_id).removeClass("ct-important");
        $(div_id + " .ct-action_unpin").hide();
        $(div_id + " .ct-action_pin").show();
        move_comment(comment);
      });
      $(div_id + " .ct-action_hide").click(function () {
        comment.chk_hidden = true;
        $(div_id).addClass("ct-hidden");
        $(div_id + " .ct-action_hide").hide();
        $(div_id + " .ct-action_unhide").show();
        if (show_hidden) {
          $(div_id).show();
        } else {
          $(div_id).hide();
        }
      });
      $(div_id + " .ct-action_unhide").click(function () {
        comment.chk_hidden = false;
        $(div_id).removeClass("ct-hidden");
        $(div_id + " .ct-action_hide").show();
        $(div_id + " .ct-action_unhide").hide();
        $(div_id).show();
      });
    }

    function comments_ready(c) {
      var i, l, i1, l1, chk_found, before;
      l = c.length;
      for (i = 0; i < l; i++) {
        chk_found = false;
        l1 = comments.length;
        for (i1 = 0; i1 < l1; i1++) {
          if (comments[i1].comment_id === c[i].comment_id) {
            chk_found = true;
            break;
          }
        }
        if (!chk_found) {
          before = find_before(c[i]);
          if (oldest_first) {
            if (before >= 0 && $("#" + comments[before].comment_id).length > 0) {
              $("#" + comments[before].comment_id).after(c[i].get_contents());
            } else {
              if (c[i].chk_pinned) {
                $("#ct-comments_pinned").prepend(c[i].get_contents());
              } else {
                $("#ct-comments_unpinned").prepend(c[i].get_contents());
              }
            }
          } else {
            if (before >= 0 && $("#" + comments[before].comment_id).length > 0) {
              $("#" + comments[before].comment_id).before(c[i].get_contents());
            } else {
              if (c[i].chk_pinned) {
                $("#ct-comments_pinned").append(c[i].get_contents());
              } else {
                $("#ct-comments_unpinned").append(c[i].get_contents());
              }
            }
          }
          create_comment_actions(c[i]);
          comments.push(c[i]);
          comments.sort(comment_sort);
        } else {
          if (c[i].chk_updated) {
            $("#" + c[i].comment_id + " > .ct-comment_time > a").html(c[i].updated.niceDate());
            $("#" + c[i].comment_id + " > .ct-comment_time").addClass("ct-comment_updated");
            $("#" + c[i].comment_id + " > .ct-comment_text").html(c[i].content);
            c[i].chk_updated = false;
          }
          if (c[i].chk_delete && !c[i].chk_deleted) {
            c[i].chk_deleted = true;
            $("#" + c[i].comment_id).css("background", "#DDD");
            $("#" + c[i].comment_id).addClass("ct-comment_deleted");
            remove_comment(c[i].comment_id);
          }
        }
      }
    }

    function update_tracking_url() {
      var i, l = posts.length, query = "";
      for (i = 0; i < l; i++) {
        if (i > 0) {
          query += "&";
        }
        switch (posts[i].post_type) {
        case PLUS_POST:
          query += "post=" + posts[i].activity_id;
          break;
        case YT_POST:
          query += "yt=" + posts[i].activity_id;
          break;
        case TWITTER_SEARCH:
          query += "tsearch=" + encodeURIComponent(posts[i].activity_id);
          break;
        case PLUS_SEARCH:
          query += "gsearch=" + encodeURIComponent(posts[i].activity_id);
          break;
        }
      }
      if (query !== "") {
        query = "?" + query;
      }
      $("#ct-tracking_url").attr("href", tracker_url + query);
    }

    function create_post_actions(post) {
      var div_id;
      div_id = "#" + post.div_id;
      if (post.post_type === PLUS_POST) {
        $(div_id + " .ct-action_reshares").click(function () {
          post.check_reshares();
        });
      }
      $(div_id + " .ct-action_hide").click(function () {
        var i, l, i1, l1, c;
        l = posts.length;
        for (i = 0; i < l; i++) {
          if (posts[i].post_user === post.post_user && posts[i].post_id === post.post_id) {
            $("#" + posts[i].div_id).remove();
            c = posts[i].get_comments();
            l1 = c.length;
            for (i1 = 0; i1 < l1; i1++) {
              $("#" + c[i1].comment_id).remove();
            }
            i1 = 0;
            while (i1 < comments.length) {
              if (comments[i1].post.post_id === posts[i].post_id && comments[i1].post.post_user === posts[i].post_user) {
                comments.splice(i1, 1);
              } else {
                i1++;
              }
            }
            color_count[posts[i].color]--;
            posts.splice(i, 1);
            update_tracking_url();
            break;
          }
        }
      });
      if (post.post_type === YT_POST) {
        $(div_id + " .ct-action_watch").click(function () {
          $("#yt_stream").html("<iframe width=\"100%\" height=\"" + $("#yt_stream").width() * 0.8 + "\" src=\"https://www.youtube-nocookie.com/embed/" + post.post_id + "\" frameborder=\"0\" allowfullscreen></iframe>");
          $(".ct-action_watch").show();
          $(".ct-action_unwatch").hide();
          $(div_id + " .ct-action_watch").hide();
          $(div_id + " .ct-action_unwatch").show();
        });
        $(div_id + " .ct-action_unwatch").click(function () {
          $("#yt_stream").html("");
          $(div_id + " .ct-action_watch").show();
          $(div_id + " .ct-action_unwatch").hide();
        });
      }
    }

    function post_ready(post_user, post_id) {
      var i, l, chk_all_done;
      l = posts.length;
      chk_all_done = true;
      for (i = 0; i < l; i++) {
        if (posts[i].post_user === post_user && posts[i].post_id === post_id) {
          if (posts[i].chk_delete) {
            color_count[posts[i].color]--;
            posts.splice(i, 1);
          } else {
            $("#ct-posts").prepend(posts[i].get_contents());
            create_post_actions(posts[i]);
            if (posts[i].valid && posts[i].ready && !posts[i].checking) {
              posts[i].check_comments(comments_ready);
            }
          }
          break;
        }
      }
      l = posts.length;
      chk_all_done = true;
      for (i = 0; i < l; i++) {
        if (!posts[i].ready) {
          chk_all_done = false;
        }
      }
      if (chk_all_done) {
        $("#ct-searching").hide();
      }
      update_tracking_url();
    }

    function Post(post_type, post_user, post_id, color, cb, chk_reshare) {
      var org_author, contents, author_name, author_pic, author_link, published, request, this_post, comments, max_results;
      this.post_type = post_type;
      this.ready = false;
      this.valid = false;
      this.checking = false;
      this.chk_delete = false;
      this.color = color;
      this.url = "";
      this.activity_id = "";
      this.org_id = "";
      this.post_user = post_user;
      this.post_id = post_id;
      this.chk_hidden = false;
      contents = "";
      author_name = "";
      author_pic = imgUrl + "noimage.png";
      author_link = "";
      published = null;
      this_post = this;
      comments = [];
      switch (this.post_type) {
      case PLUS_POST:
        this.service_pic = imgUrl + "comment.png";
        max_results = 100;
        break;
      case YT_POST:
        this.service_pic = imgUrl + "youtube.png";
        max_results = 50;
        break;
      case PLUS_SEARCH:
        this.service_pic = imgUrl + "gplus.png";
        max_results = 20;
        author_pic = imgUrl + "search.png";
        break;
      case TWITTER_SEARCH:
        this.service_pic = imgUrl + "twitter.png";
        max_results = 100;
        author_pic = imgUrl + "search.png";
        break;
      }

      if (this.post_type === TWITTER_SEARCH || this.post_type === PLUS_SEARCH) {
        this.activity_id = post_id;
        this.post_id = search_id;
        search_id++;
      }
      this.div_id = this.post_user + "_" + this.post_id;

      if (this.post_type === TWITTER_SEARCH) {
        contents = "Twitter search for<br><b>" + this.activity_id + "</b>";
        this.url = "https://twitter.com/#!/search/" + encodeURIComponent(this.activity_id);
        this.ready = true;
        this.valid = true;
        global.setTimeout(function () {
          cb(this_post.post_user, this_post.post_id);
        }, 10);
      }
      if (this.post_type === PLUS_SEARCH) {
        contents = "Google+ search for<br><b>" + this.activity_id + "</b>";
        this.url = "https://plus.google.com/s/" + encodeURIComponent(this.activity_id);
        this.ready = true;
        this.valid = true;
        global.setTimeout(function () {
          cb(this_post.post_user, this_post.post_id);
        }, 10);
      }
      if (this.post_type === PLUS_POST) {
        if (!this.post_user) {
          this.activity_id = post_id;
          request = "https://www.googleapis.com/plus/v1/activities/" + this.activity_id + "?callback=?&key=" + apiKey;
          $.jsonp({
            "url": request,
            "success": function (item) {
              if (item.object) {
                this_post.post_user = item.actor.id;
                this_post.div_id = this_post.post_user + "_" + this_post.post_id;
                if (item.url.indexOf("plus.google.com") >= 0) {
                  this_post.url = item.url;
                } else {
                  this_post.url = "https://plus.google.com/" + item.url;
                }
                contents = item.title;
                if ($.trim(contents) === "") {
                  contents = "(No post text...)";
                }
                author_name = item.actor.displayName;
                author_pic = item.actor.image.url;
                author_link = item.actor.url;
                published = new Date(item.published);
                this_post.valid = true;
                this_post.org_id = item.object.id || item.id;
                if (item.object.actor) {
                  org_author = item.object.actor.id;
                } else {
                  org_author = item.actor.id;
                }
              } else {
                contents = "Post " + this_post.post_id + " not found.";
              }
              this_post.ready = true;
              global.setTimeout(function () { cb(this_post.post_user, this_post.post_id); }, 10);
            },
            "error": function () {
              contents = "Post " + this_post.post_id + " not found.";
              this_post.ready = true;
              global.setTimeout(function () { cb(this_post.post_user, this_post.post_id); }, 10);
            }
          });
        } else {
          request = "https://www.googleapis.com/plus/v1/people/" + post_user + "/activities/public?callback=?&maxResults=" + max_results + "&key=" + apiKey;
          $.jsonp({
            "url": request,
            "success": function (resp) {
              var i, l, api_url, api_url_parts, item_id, item;
              if (resp.items) {
                l = resp.items.length;
                for (i = 0; i < l; i++) {
                  if (chk_reshare) {
                    if ((resp.items[i].object.id === this_post.post_id) || (!resp.items[i].object.id && (resp.items[i].id === this_post.post_id))) {
                      this_post.activity_id = resp.items[i].id;
                      item_id = i;
                      break;
                    }
                  } else {
                    api_url = resp.items[i].url;
                    api_url_parts = api_url.split("/");
                    if (api_url_parts.length > 0) {
                      if (this_post.post_type === PLUS_POST) {
                        if (api_url_parts[api_url_parts.length - 1] === this_post.post_id) {
                          this_post.activity_id = resp.items[i].id;
                          item_id = i;
                          break;
                        }
                      }
                    }
                  }
                }
                if (this_post.activity_id === "") {
                  if (chk_reshare) {
                    contents = "Reshare by user " + this_post.post_user + " not found.";
                    this_post.chk_delete = true;
                  } else {
                    contents = "Post " + this_post.post_id + " for user " + this_post.post_user + " not found. Please check your Post URL and make sure it's a public post.";
                  }
                } else {
                  item = resp.items[item_id];
                  if (item.url.indexOf("plus.google.com") >= 0) {
                    this_post.url = item.url;
                  } else {
                    this_post.url = "https://plus.google.com/" + item.url;
                  }
                  contents = item.title;
                  if ($.trim(contents) === "") {
                    contents = "(No post text...)";
                  }
                  author_name = item.actor.displayName;
                  author_pic = item.actor.image.url;
                  author_link = item.actor.url;
                  published = new Date(item.published);
                  this_post.valid = true;
                  this_post.org_id = item.object.id || item.id;
                  if (item.object.actor) {
                    org_author = item.object.actor.id;
                  } else {
                    org_author = item.actor.id;
                  }
                }
                this_post.ready = true;
                global.setTimeout(function () { cb(this_post.post_user, this_post.post_id); }, 10);
              } else {
                contents = "No posts found for User ID " + this_post.post_user + "<br>\nPlease check your Post URL and make sure it's a public post.";
                if (resp.error) {
                  contents += "<br>API Error: " + resp.error.message;
                }
                this_post.ready = true;
                if (chk_reshare) {
                  this_post.chk_delete = true;
                }
                global.setTimeout(function () { cb(this_post.post_user, this_post.post_id); }, 10);
              }
            },
            "error": function () {
              contents = "No posts found for User ID " + this_post.post_user + "<br>\nPlease check your Post URL and make sure it's a public post.";
              this_post.ready = true;
              if (chk_reshare) {
                this_post.chk_delete = true;
              }
              global.setTimeout(function () { cb(this_post.post_user, this_post.post_id); }, 10);
            }
          });
        }
      }
      if (this.post_type === YT_POST) {
        request = "https://gdata.youtube.com/feeds/api/videos/" + this.post_id + "?callback=?&alt=json&key=" + ytApiKey;
        $.jsonp({
          "url": request,
          "success": function (data) {
            this_post.chk_complete = true;
            if (data.entry) {
              this_post.activity_id = this_post.post_id;
              this_post.url = "https://www.youtube.com/watch?v=" + this_post.post_id;
              contents = "";
              if (data.entry.title) {
                contents += data.entry.title.$t;
              }
              if (data.entry.content) {
                if (contents !== "") {
                  contents += " - ";
                }
                contents += data.entry.content.$t;
              }
              contents = contents.substring(0, 100) + "<br>";
              author_name = data.entry.author[0].name.$t;
              author_pic = "https://s.ytimg.com/yt/img/creators_corner/YouTube/youtube_32x32.png";
              author_link = data.entry.author[0].uri.$t;
              published = new Date(data.entry.published.$t);
              this_post.valid = true;
            } else {
              contents = "Video ID " + this_post.post_id + " not found.<br>\nPlease check your URL.";
              this_post.valid = false;
            }
            this_post.ready = true;
            global.setTimeout(function () { cb(this_post.post_user, this_post.post_id); }, 10);
          },
          "error": function () {
            this_post.chk_complete = true;
            contents = "Video ID " + this_post.post_id + " not found.<br>\nPlease check your URL.";
            this_post.ready = true;
            this_post.valid = false;
            global.setTimeout(function () { cb(this_post.post_user, this_post.post_id); }, 10);
          }
        });
      }

      this.get_contents = function () {
        var str_tmp = "", style;
        style = "ct-background-" + this_post.color;
        str_tmp += "<div id=\"" + this_post.div_id + "\" class=\"ct-post " + style + "\">";
        str_tmp += "<div class=\"ct-actions\">";
        if (this_post.post_type === PLUS_POST) {
          str_tmp += "<div class=\"ct-action ct-action_reshares\"" + " title=\"Check reshares\"></div>";
        }
        str_tmp += "<div class=\"ct-action ct-action_hide\"" + (this_post.chk_shared && this_post.chk_hidden ? " style=\"display: none\"" : "") + " title=\"" + (this_post.chk_shared ? "Hide" : "Remove") + "\"></div>";
        str_tmp += "<div class=\"ct-action ct-action_unhide\"" + (this_post.chk_shared && this_post.chk_hidden ? "" : " style=\"display: none\"") + " title=\"Unhide\"></div>";
        if (this_post.post_type === YT_POST) {
          str_tmp += "<div class=\"ct-action ct-action_watch\" title=\"Watch video\"></div>";
          str_tmp += "<div class=\"ct-action ct-action_unwatch\" title=\"Remove video\" style=\"display: none\"></div>";
        }
        str_tmp += "</div>";
        str_tmp += "<img class=\"ct-post_pic\" src=\"" + author_pic + "\">\n";
        str_tmp += "<img class=\"ct-service_pic\" src=\"" + this_post.service_pic + "\">\n";
        if (this_post.activity_id !== "") {
          if (this_post.post_type !== TWITTER_SEARCH && this_post.post_type !== PLUS_SEARCH) {
            str_tmp += "<div class=\"ct-post_time\"><a href=\"" + this_post.url + "\" target=\"_blank\">" + published.niceDate() + "</a></div>";
            str_tmp += "<b>" + author_name + "</b><br>";
          } else {
            str_tmp += "<div class=\"ct-post_time\"><a href=\"" + this_post.url + "\" target=\"_blank\">Search</a></div>";
          }
        }
        str_tmp += "<div class=\"ct-post_text\">" + contents + "</div></div>";
        return str_tmp;
      };

      this.check_reshares = function () {
        var chk_found, l1, i1;
        if (this_post.post_type === PLUS_POST) {
          if (this_post.activity_id !== this_post.org_id) {
            chk_found = false;
            l1 = posts.length;
            for (i1 = 0; i1 < l1; i1++) {
              if (posts[i1].post_user === org_author && posts[i1].activity_id === this_post.org_id) {
                chk_found = true;
                break;
              }
            }
            if (!chk_found) {
              add_post(this_post.org_id);
            }
          }

          request = "https://www.googleapis.com/plus/v1/activities/" + this.activity_id + "/people/resharers?callback=?&maxResults=100&key=" + apiKey;
          $.jsonp({
            "url": request,
            "success": function (resp) {
              var i, l, item, post, chk_found, l1, i1, col, min_col;
              if (resp.items) {
                l = resp.items.length;
                for (i = 0; i < l; i++) {
                  item = resp.items[i];
                  chk_found = false;
                  l1 = posts.length;
                  if (this_post.post_user === item.id) {
                    chk_found = true;
                  }

                  for (i1 = 0; i1 < l1; i1++) {
                    if (posts[i1].post_user === item.id && posts[i1].org_id === this_post.org_id) {
                      chk_found = true;
                      break;
                    }
                  }

                  if (!chk_found) {
                    $("#ct-searching").show();
                    min_col = Math.floor(posts.length / 10);
                    l1 = color_count.length;
                    col = 0;
                    for (i1 = 0; i1 < l1; i1++) {
                      if (color_count[i1] <= min_col) {
                        col = i1;
                        break;
                      }
                    }
                    post = new Post(PLUS_POST, item.id, this_post.org_id, col, post_ready, true);
                    color_count[col]++;
                    posts.push(post);
                  }
                }
              }
            },
            "error": function () {}
          });
        }
      };

      this.check_comments = function (cb) {
        var request;
        if (this_post.activity_id !== "") {
          if (this.post_type === PLUS_SEARCH) {
            this.checking = true;
            request = "https://www.googleapis.com/plus/v1/activities?query=" + encodeURIComponent(this.activity_id) + "&callback=?&orderBy=recent&maxResults=20&key=" + apiKey;
            $.jsonp({
              "url": request,
              "success": function (resp) {
                var i, i1, l, l1, id, chk_new, item;
                if (resp.items) {
                  l1 = comments.length;
                  for (i1 = 0; i1 < l1; i1++) {
                    comments[i1].chk_found = false;
                  }
                  l = resp.items.length;
                  for (i = 0; i < l; i++) {
                    item = resp.items[i];
                    chk_new = true;
                    l1 = comments.length;
                    id = this_post.div_id + "_" + item.id;
                    id = id.replace(/\W/gi, "_");
                    for (i1 = 0; i1 < l1; i1++) {
                      if (comments[i1].comment_id === id) {
                        comments[i1].chk_found = true;
                        if (comments[i1].updated.getTime() !== (new Date(item.updated)).getTime()) {
                          comments[i1].updated = new Date(item.updated);
                          comments[i1].content = item.title + "<br>";
                          comments[i1].chk_updated = true;
                        }
                        chk_new = false;
                        break;
                      }
                    }
                    if (chk_new) {
                      if (item.url.indexOf("plus.google.com") < 0) {
                        item.url = "https://plus.google.com/" + item.url;
                      }
                      comments.push(new Comment(this_post, id, item.actor.displayName, item.actor.image.url, new Date(item.published), new Date(item.updated), item.title + "<br>", item.url, item.id));
                    }
                  }
                }
                comments.sort(comment_sort);
                global.setTimeout(function () {
                  cb(comments);
                }, 10);
                this_post.checking = false;
              },
              "error": function () {
                this_post.checking = false;
              }
            });
          }

          if (this.post_type === TWITTER_SEARCH) {
            request = "https://search.twitter.com/search.json?q=" + encodeURIComponent(this_post.activity_id) + "&result_type=recent&rpp=" + max_results + "&callback=?";
            this.checking = true;
            $.jsonp({
              "url": request,
              "success": function (resp) {
                var i, i1, l, l1, id, chk_new, item, url;
                if (resp.results) {
                  l1 = comments.length;
                  for (i1 = 0; i1 < l1; i1++) {
                    comments[i1].chk_found = false;
                  }
                  l = resp.results.length;
                  for (i = 0; i < l; i++) {
                    item = resp.results[i];
                    chk_new = true;
                    l1 = comments.length;
                    id = this_post.div_id + "_" + item.from_user_id_str + "_" + item.id_str;
                    id = id.replace(/\W/gi, "_");
                    url = "https://twitter.com/" + item.from_user + "/status/" + item.id_str;
                    for (i1 = 0; i1 < l1; i1++) {
                      if (comments[i1].comment_id === id) {
                        comments[i1].chk_found = true;
                        chk_new = false;
                        break;
                      }
                    }
                    if (chk_new) {
                      comments.push(new Comment(this_post, id, item.from_user, item.profile_image_url_https, new Date(item.created_at), new Date(item.created_at), item.text + "<br>", url));
                    }
                  }
                }
                comments.sort(comment_sort);
                global.setTimeout(function () {
                  cb(comments);
                }, 10);
                this_post.checking = false;
              },
              "error": function () {
                this_post.checking = false;
              }
            });
          }

          if (this.post_type === PLUS_POST) {
            this.checking = true;
            request = "https://www.googleapis.com/plus/v1/activities/" + this_post.activity_id + "/comments?callback=?&sortOrder=descending&maxResults=500&key=" + apiKey;
            $.jsonp({
              "url": request,
              "success": function (resp) {
                var i, i1, l, l1, chk_new, item;
                l1 = comments.length;
                for (i1 = 0; i1 < l1; i1++) {
                  comments[i1].chk_found = false;
                }
                if (resp.items) {
                  l = resp.items.length;
                  for (i = 0; i < l; i++) {
                    item = resp.items[i];
                    chk_new = true;
                    l1 = comments.length;
                    item.id = item.id.replace(/\W/gi, "_");
                    for (i1 = 0; i1 < l1; i1++) {
                      if (comments[i1].comment_id === item.id) {
                        comments[i1].chk_found = true;
                        if (comments[i1].updated.getTime() !== (new Date(item.updated)).getTime()) {
                          comments[i1].updated = new Date(item.updated);
                          comments[i1].content = item.object.content;
                          comments[i1].chk_updated = true;
                        }
                        chk_new = false;
                        break;
                      }
                    }
                    if (chk_new) {
                      comments.push(new Comment(this_post, item.id, item.actor.displayName, item.actor.image.url, new Date(item.published), new Date(item.updated), item.object.content));
                    }
                  }
                }
                comments.sort(comment_sort);
                l1 = comments.length;
                for (i1 = Math.max(l1 - max_results, 0); i1 < l1; i1++) {
                  if (!comments[i1].chk_found) {
                    comments[i1].chk_delete = true;
                  }
                }
                global.setTimeout(function () { cb(comments); }, 10);
                this_post.checking = false;
              },
              "error": function () {
                this_post.checking = false;
              }
            });
          }

          if (this.post_type === YT_POST) {
            this.checking = true;
            request = "https://gdata.youtube.com/feeds/api/videos/" + this.post_id + "/comments?callback=?&alt=json&max-results=" + max_results + "&key=" + ytApiKey;
            $.jsonp({
              "url": request,
              "success": function (data) {
                var i, i1, l, l1, chk_new, item, id, numResults;
                l1 = comments.length;
                for (i1 = 0; i1 < l1; i1++) {
                  comments[i1].chk_found = false;
                }
                numResults = 0;
                if (data.feed.entry) {
                  l = data.feed.entry.length;
                  numResults = l;
                  for (i = 0; i < l; i++) {
                    item = data.feed.entry[i];
                    chk_new = true;
                    l1 = comments.length;
                    id = item.id.$t.replace(/\W/gi, "_");
                    for (i1 = 0; i1 < l1; i1++) {
                      if (comments[i1].comment_id === id) {
                        comments[i1].chk_found = true;
                        if (comments[i1].updated.getTime() !== (new Date(item.updated.$t)).getTime()) {
                          comments[i1].updated = new Date(item.updated.$t);
                          comments[i1].content = item.content.$t;
                          comments[i1].chk_updated = true;
                        }
                        chk_new = false;
                        break;
                      }
                    }
                    if (chk_new) {
                      comments.push(new Comment(this_post, id, item.author[0].name.$t, "https://s.ytimg.com/yt/img/creators_corner/YouTube/youtube_32x32.png", new Date(item.published.$t), new Date(item.updated.$t), item.content.$t));
                    }
                  }
                }
                comments.sort(comment_sort);
                l1 = comments.length;
                for (i1 = Math.max(l1 - numResults, 0); i1 < l1; i1++) {
                  if (!comments[i1].chk_found) {
                    comments[i1].chk_delete = true;
                  }
                }
                global.setTimeout(function () { cb(comments); }, 10);
                this_post.checking = false;
              },
              "error": function () {
                this_post.checking = false;
              }
            });
          }
        }
      };

      this.get_comments = function () {
        return comments;
      };
    }

    add_post = function (activity_id) {
      var i, l, chk_found, post, min_col, col;
      chk_found = false;
      l = posts.length;
      for (i = 0; i < l; i++) {
        if (posts[i].activity_id === activity_id) {
          chk_found = true;
          break;
        }
      }
      if (!chk_found) {
        $("#ct-searching").show();
        min_col = Math.floor(posts.length / 10);
        l = color_count.length;
        col = 0;
        for (i = 0; i < l; i++) {
          if (color_count[i] <= min_col) {
            col = i;
            break;
          }
        }
        color_count[col]++;
        post = new Post(PLUS_POST, "", activity_id, col, post_ready, false);
        posts.push(post);
      }
    };

    function check_comments() {
      var i, l;
      l = posts.length;
      for (i = 0; i < l; i++) {
        if (posts[i].valid && posts[i].ready && !posts[i].checking) {
          posts[i].check_comments(comments_ready);
        }
      }
    }

    function parse_url(query) {
      var q, param, query_string;
      if (query) {
        query_string = query.split("&");
      } else {
        query_string = global.location.search.substr(1).split("&");
      }
      for (q = 0; q < query_string.length; q++) {
        if (query_string[q]) {
          param = query_string[q].split("=");
          if (param.length === 2) {
            param[1] = decodeURIComponent(param[1].replace(/\+/g, " "));
            switch (param[0].toUpperCase()) {
            case "POST":
              add_post(param[1]);
              break;
            case "URL":
              add_url(param[1]);
              break;
            case "TSEARCH":
              search(TWITTER_SEARCH, param[1]);
              break;
            case "GSEARCH":
              search(PLUS_SEARCH, param[1]);
              break;
            case "YT":
              add_url("http://youtu.be/" + param[1]);
              break;
            }
          }
        }
      }
    }

    add_url = function (url) {
      var i, l, chk_found, post, min_col, col, url_parts, post_user, post_id;
      $("#ct-warning").hide();
      if (!url || typeof (url) !== "string") {
        url = $.trim($("#ct-post_url").val());
      }
      if (url.toLowerCase().indexOf("allmyplus.com") >= 0) {
        i = url.toLowerCase().indexOf("?");
        if (i >= 0) {
          url = url.substr(i + 1);
          parse_url(url);
          $("#ct-post_url").val("");
        }
      } else if (url.toLowerCase().indexOf("youtube.com") >= 0 || url.toLowerCase().indexOf("youtu.be") >= 0) {
        post_id = "";
        i = url.toLowerCase().indexOf("?v=");
        if (i >= 0) {
          $("#ct-post_url").val("");
          post_id = url.substr(i + 3);
        }
        if (post_id === "") {
          i = url.toLowerCase().indexOf("youtu.be/");
          if (i >= 0) {
            $("#ct-post_url").val("");
            post_id = url.substr(i + 9);
          }
        }
        if (post_id === "") {
          i = url.toLowerCase().indexOf("/embed/");
          if (i >= 0) {
            $("#ct-post_url").val("");
            post_id = url.substr(i + 7);
          }
        }
        if (post_id !== "") {
          i = post_id.indexOf("&");
          if (i >= 0) {
            post_id = post_id.substring(0, i);
          }
          i = post_id.indexOf("#");
          if (i >= 0) {
            post_id = post_id.substring(0, i);
          }
          i = post_id.indexOf("/");
          if (i >= 0) {
            post_id = post_id.substring(0, i);
          }
          i = post_id.indexOf('"');
          if (i >= 0) {
            post_id = post_id.substring(0, i);
          }
          i = post_id.indexOf("'");
          if (i >= 0) {
            post_id = post_id.substring(0, i);
          }
          chk_found = false;
          l = posts.length;
          for (i = 0; i < l; i++) {
            if (posts[i].post_user === "YT" && posts[i].post_id === post_id) {
              chk_found = true;
              break;
            }
          }
          if (!chk_found) {
            $("#ct-searching").show();
            min_col = Math.floor(posts.length / 10);
            l = color_count.length;
            col = 0;
            for (i = 0; i < l; i++) {
              if (color_count[i] <= min_col) {
                col = i;
                break;
              }
            }
            color_count[col]++;
            post = new Post(YT_POST, "YT", post_id, col, post_ready, false);
            posts.push(post);
          }
        } else {
          $("#ct-warning").show();
        }
      } else {
        url = url.split("?")[0];
        url_parts = url.split("/");
        l = url_parts.length;
        if (url_parts[l - 2] === "posts" && l >= 3) {
          $("#ct-post_url").val("");
          post_user = url_parts[l - 3];
          post_id = url_parts[l - 1];

          chk_found = false;
          l = posts.length;
          for (i = 0; i < l; i++) {
            if (posts[i].post_user === post_user && posts[i].post_id === post_id) {
              chk_found = true;
              break;
            }
          }
          if (!chk_found) {
            $("#ct-searching").show();
            min_col = Math.floor(posts.length / 10);
            l = color_count.length;
            col = 0;
            for (i = 0; i < l; i++) {
              if (color_count[i] <= min_col) {
                col = i;
                break;
              }
            }
            color_count[col]++;
            post = new Post(PLUS_POST, post_user, post_id, col, post_ready, false);
            posts.push(post);
          }
        } else {
          $("#ct-warning").show();
        }
      }
    };

    search = function (t, term) {
      var i, l, chk_found, post, min_col, col, post_user, post_id;
      if (t !== TWITTER_SEARCH && t !== PLUS_SEARCH) {
        return;
      }
      $("#ct-warning").hide();
      term = term || $.trim($("#ct-post_url").val());
      $("#ct-post_url").val("");
      if (term && term !== "") {
        switch (t) {
        case TWITTER_SEARCH:
          post_user = "TW";
          break;
        case PLUS_SEARCH:
          post_user = "PS";
          break;
        }
        post_id = term;
        chk_found = false;
        l = posts.length;
        for (i = 0; i < l; i++) {
          if (posts[i].post_user === post_user && posts[i].activity_id === post_id) {
            chk_found = true;
            break;
          }
        }
        if (!chk_found) {
          $("#ct-searching").show();
          min_col = Math.floor(posts.length / 10);
          l = color_count.length;
          col = 0;
          for (i = 0; i < l; i++) {
            if (color_count[i] <= min_col) {
              col = i;
              break;
            }
          }
          color_count[col]++;
          post = new Post(t, post_user, post_id, col, post_ready, false);
          posts.push(post);
        }
      }
    };

    function search_gplus() {
      search(PLUS_SEARCH);
    }

    function search_twitter() {
      search(TWITTER_SEARCH);
    }

    function resort_comments() {
      var i, l, new_comments;
      l = comments.length;
      new_comments = [];
      for (i = 0; i < l; i++) {
        if (!comments[i].chk_deleted) {
          new_comments.push(comments[i]);
        }
      }
      new_comments.sort(comment_sort);
      comments.length = 0;
      $("#ct-comments_pinned").html("");
      $("#ct-comments_unpinned").html("");
      comments_ready(new_comments);
      if (!show_hidden) {
        $(".ct-comment.ct-hidden").hide();
      }
    }

    function recolor_comments() {
      var i, l;
      l = comments.length;
      for (i = 0; i < l; i++) {
        if (!comments[i].chk_deleted) {
          comments[i].recolor(use_colors);
        }
      }
    }

    function initializeApp() {
      $("#ct-add_url").click(add_url);
      $("#ct-search_gplus").click(search_gplus);
      $("#ct-search_twitter").click(search_twitter);
      $("#ct-oldest_first").click(function () {
        oldest_first = $("#ct-oldest_first").prop("checked");
        resort_comments();
      });
      $("#ct-use_colors").click(function () {
        use_colors = $("#ct-use_colors").prop("checked");
        recolor_comments();
      });
      $("#ct-show_hidden").click(function () {
        show_hidden = $("#ct-show_hidden").prop("checked");
        if (show_hidden) {
          $(".ct-comment.ct-hidden").show();
        } else {
          $(".ct-comment.ct-hidden").hide();
        }
      });
      parse_url();
      global.setInterval(check_comments, 60000);
    }

    this.init = function () {
      imgUrl = "images/";
      apiKey = "<API-KEY>";
      ytApiKey = "<YT-API-KEY>";
      initializeApp();
    };
  }

  commentTracker = new CommentTracker();
  commentTracker.init();
}(this));