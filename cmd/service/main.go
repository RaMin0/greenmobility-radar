package main

import (
	"bytes"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path"
	"time"
)

const (
	defaultServerPort         = "8000"
	greenMobilityProxyBaseURL = "https://greenmobility.frontend.fleetbird.eu/api/prod/v1.06"
	virtaAIProxyBaseURL       = "https://ai.virta-ev.com/api/v1/map/blocks"
)

var (
	serverPort            = os.Getenv("PORT")
	googleMapsAPIKey      = os.Getenv("GOOGLE_MAPS_API_KEY")
	staticAssetsTimestamp = time.Now().Format("20060102150405")
)

func main() {
	http.HandleFunc("/api/cars", handlerProxy(greenMobilityProxyBaseURL, "/map/cars"))
	http.HandleFunc("/api/car_types", handlerProxy(greenMobilityProxyBaseURL, "/cars/types"))
	http.HandleFunc("/api/stations", handlerProxy(virtaAIProxyBaseURL, ""))
	http.HandleFunc("/", handlerStatic)

	if serverPort == "" {
		serverPort = defaultServerPort
	}
	fmt.Printf("Listening on port %s...\n", serverPort)
	http.ListenAndServe(":"+serverPort, nil)
}

func handlerProxy(baseURL, path string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var (
			err error
			uri *url.URL
			res *http.Response
		)
		defer func() {
			var errString string
			if err != nil {
				errString = " " + err.Error()
			}
			fmt.Println(r.Method, uri, res.StatusCode, errString)
		}()

		uri, err = url.Parse(baseURL + path)
		uri.RawQuery = r.URL.RawQuery
		req, err := http.NewRequest(r.Method, uri.String(), r.Body)
		req.Header.Add("Content-Type", "application/json")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		res, err = http.DefaultClient.Do(req)
		if err != nil {
			http.Error(w, err.Error(), res.StatusCode)
			return
		}
		defer res.Body.Close()
		w.Header().Add("Access-Control-Allow-Origin", "*")
		w.Header().Add("Content-Type", "application/json")
		w.WriteHeader(res.StatusCode)
		io.Copy(w, res.Body)
	}
}

func handlerStatic(w http.ResponseWriter, r *http.Request) {
	c := httptest.NewRecorder()
	http.FileServer(http.Dir("static")).ServeHTTP(c, r)

	body, _ := ioutil.ReadAll(c.Body)
	for k, v := range map[string]string{
		"GOOGLE_MAPS_API_KEY":     googleMapsAPIKey,
		"STATIC_ASSETS_TIMESTAMP": staticAssetsTimestamp,
	} {
		body = bytes.ReplaceAll(body, []byte(fmt.Sprintf("${%s}", k)), []byte(v))
	}

	switch path.Ext(r.URL.Path) {
	case ".css":
		w.Header().Add("Content-Type", "text/css")
	case ".js":
		w.Header().Add("Content-Type", "text/javascript; charset=utf-8")
	}
	io.Copy(w, bytes.NewReader(body))
}
